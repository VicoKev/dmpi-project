from fastapi import APIRouter, HTTPException, status, Depends
from app.database_mongo import dossiers_medicaux_collection
from app.schemas.dossier_medical import DossierMedicalMongo, DossierMedicalUpdate, ArreterTraitementRequest
from app.security import get_current_user, require_role, verifier_acces_dossier_patient
from app.models_sql import User
from app.audit import enregistrer_log
from app.kafka_producer import publier_evenement
from datetime import datetime, date as dt_date

router = APIRouter(
    prefix="/dossiers",
    tags=["Dossiers Médicaux (MongoDB)"]
)


def _normaliser_date_naissance(dossier_dict: dict) -> None:
    """BSON n'encode pas datetime.date : on le convertit en datetime avant insertion/mise à jour."""
    d_n = dossier_dict.get("date_naissance")
    if isinstance(d_n, dt_date) and not isinstance(d_n, datetime):
        dossier_dict["date_naissance"] = datetime.combine(d_n, datetime.min.time())


@router.post("/", status_code=status.HTTP_201_CREATED)
async def creer_dossier_medical(
    dossier: DossierMedicalMongo,
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    dossier_existant = await dossiers_medicaux_collection.find_one({"npi": dossier.npi})
    if dossier_existant:
        await enregistrer_log(
            utilisateur_email=current_user.email,
            action="CREATION_DOSSIER",
            statut_action="ECHEC",
            npi_concerne=dossier.npi
        )
        raise HTTPException(
            status_code=400,
            detail=f"Un dossier médical avec le NPI {dossier.npi} existe déjà."
        )

    dossier_dict = dossier.model_dump()
    _normaliser_date_naissance(dossier_dict)
    dossier_dict["updated_at"] = datetime.utcnow()

    await dossiers_medicaux_collection.insert_one(dossier_dict)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_DOSSIER",
        statut_action="SUCCES",
        npi_concerne=dossier.npi
    )

    await publier_evenement("dmpi.dossiers", {
        "type": "NOUVEAU_DOSSIER",
        "npi": dossier.npi,
        "auteur": current_user.email,
        "horodatage": datetime.utcnow().isoformat()
    })

    return {"message": "Dossier médical créé avec succès dans MongoDB !", "npi": dossier.npi}


@router.get("/{npi}", response_model=DossierMedicalMongo)
async def obtenir_dossier_medical(
    npi: str,
    current_user: User = Depends(get_current_user)
):
    await verifier_acces_dossier_patient(current_user, npi)

    if len(npi) != 10 or not npi.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Le NPI doit être composé d'exactement 10 chiffres."
        )

    dossier = await dossiers_medicaux_collection.find_one({"npi": npi})

    if not dossier:
        await enregistrer_log(
            utilisateur_email=current_user.email,
            action="RECHERCHE_NPI",
            statut_action="ECHEC",
            npi_concerne=npi
        )
        raise HTTPException(
            status_code=404,
            detail=f"Aucun dossier médical trouvé dans MongoDB pour le NPI : {npi}"
        )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="RECHERCHE_NPI",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    return dossier

@router.put("/{npi}", response_model=DossierMedicalMongo)
async def mettre_a_jour_dossier(
    npi: str,
    dossier_update: DossierMedicalUpdate,
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """
    Met à jour un dossier médical existant.
    Notifie les autres professionnels via Kafka (mise à jour temps réel du dossier).
    """
    dossier_existant = await dossiers_medicaux_collection.find_one({"npi": npi})
    if not dossier_existant:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun dossier médical trouvé pour le NPI : {npi}"
        )

    # exclude_unset : seuls les champs réellement envoyés par le client sont appliqués.
    # Un formulaire qui ne gère qu'une partie du dossier (ex: pas nom/prénom/tuteur)
    # ne doit jamais écraser les autres champs avec leurs valeurs par défaut.
    dossier_dict = dossier_update.model_dump(exclude_unset=True)
    _normaliser_date_naissance(dossier_dict)

    dossier_dict["updated_at"] = datetime.utcnow()

    await dossiers_medicaux_collection.update_one(
        {"npi": npi},
        {"$set": dossier_dict}
    )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="MISE_A_JOUR_DOSSIER",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    await publier_evenement("dmpi.dossiers", {
        "type": "MISE_A_JOUR_DOSSIER",
        "npi": npi,
        "auteur": current_user.email,
        "horodatage": datetime.utcnow().isoformat()
    })

    dossier_maj = await dossiers_medicaux_collection.find_one({"npi": npi})
    return dossier_maj


@router.patch("/{npi}/traitements/{index}/arreter", response_model=DossierMedicalMongo)
async def arreter_traitement(
    npi: str,
    index: int,
    body: ArreterTraitementRequest | None = None,
    current_user: User = Depends(require_role("medecin"))
):
    """
    Arrête un traitement en cours — décision clinique réservée au médecin.
    Le traitement reste dans la liste (actif=False) plutôt que d'être
    supprimé, pour préserver l'historique médicamenteux du patient.
    """
    dossier = await dossiers_medicaux_collection.find_one({"npi": npi})
    if not dossier:
        raise HTTPException(status_code=404, detail=f"Aucun dossier médical trouvé pour le NPI : {npi}")

    traitements = dossier.get("traitements_en_cours", [])
    if index < 0 or index >= len(traitements):
        raise HTTPException(status_code=400, detail="Traitement introuvable à cet index.")
    if not traitements[index].get("actif", True):
        raise HTTPException(status_code=400, detail="Ce traitement est déjà arrêté.")

    motif = body.motif.strip() if body and body.motif else None

    await dossiers_medicaux_collection.update_one(
        {"npi": npi},
        {"$set": {
            f"traitements_en_cours.{index}.actif": False,
            f"traitements_en_cours.{index}.date_arret": datetime.utcnow(),
            f"traitements_en_cours.{index}.motif_arret": motif,
            "updated_at": datetime.utcnow(),
        }}
    )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ARRET_TRAITEMENT",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    dossier_maj = await dossiers_medicaux_collection.find_one({"npi": npi})
    return dossier_maj
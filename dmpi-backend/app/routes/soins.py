from fastapi import APIRouter, HTTPException, status, Depends
from app.database_mongo import (
    constantes_vitales_collection,
    administrations_collection,
    consultations_collection,
)
from app.schemas.soins import ConstantesVitales, AdministrationTraitement
from app.security import get_current_user, require_role
from app.models_sql import User
from app.audit import enregistrer_log
from app.kafka_producer import publier_evenement
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(
    prefix="/soins",
    tags=["Espace Infirmier / Paramédical"]
)


def _valider_npi(npi: str):
    if len(npi) != 10 or not npi.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Le NPI doit être composé d'exactement 10 chiffres."
        )


@router.post("/constantes", status_code=status.HTTP_201_CREATED)
async def enregistrer_constantes(
    constantes: ConstantesVitales,
    current_user: User = Depends(require_role("infirmier", "medecin"))
):
    """
    Saisie des constantes vitales (tension, pouls, température, SpO2).
    Réservé aux infirmiers et médecins.
    """
    _valider_npi(constantes.npi)

    constantes_dict = constantes.model_dump()
    constantes_dict["releve_par"] = current_user.email

    result = await constantes_vitales_collection.insert_one(constantes_dict)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="SAISIE_CONSTANTES_VITALES",
        statut_action="SUCCES",
        npi_concerne=constantes.npi
    )

    await publier_evenement("dmpi.constantes", {
        "type": "NOUVELLES_CONSTANTES",
        "npi": constantes.npi,
        "auteur": current_user.email,
        "horodatage": datetime.utcnow().isoformat()
    })

    return {
        "message": "Constantes vitales enregistrées avec succès !",
        "constante_id": str(result.inserted_id),
        "npi_patient": constantes.npi
    }


@router.get("/constantes/patient/{npi}", response_model=list[ConstantesVitales])
async def lister_constantes_patient(
    npi: str,
    current_user: User = Depends(get_current_user)
):
    """
    Historique des constantes vitales d'un patient, du plus récent au plus ancien.
    """
    _valider_npi(npi)

    cursor = constantes_vitales_collection.find({"npi": npi}).sort("created_at", -1)
    constantes = await cursor.to_list(length=200)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="LECTURE_CONSTANTES_VITALES",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    return constantes


@router.get("/constantes/moi", response_model=list[ConstantesVitales])
async def lister_mes_constantes(
    current_user: User = Depends(require_role("infirmier", "medecin"))
):
    """
    Historique des relevés de constantes saisis par le professionnel connecté
    (du plus récent au plus ancien) — alimente le tableau de bord et
    l'historique personnel de l'infirmier.
    """
    cursor = constantes_vitales_collection.find(
        {"releve_par": current_user.email}
    ).sort("created_at", -1)
    return await cursor.to_list(length=200)


@router.post("/administrations", status_code=status.HTTP_201_CREATED)
async def valider_administration_traitement(
    administration: AdministrationTraitement,
    current_user: User = Depends(require_role("infirmier", "medecin"))
):
    """
    Validation par l'infirmier de l'administration effective d'un médicament
    prescrit dans une consultation (traçabilité de la prise en charge).
    """
    _valider_npi(administration.npi)

    if administration.consultation_id:
        try:
            consultation = await consultations_collection.find_one(
                {"_id": ObjectId(administration.consultation_id)}
            )
        except InvalidId:
            raise HTTPException(
                status_code=400,
                detail="Identifiant de consultation invalide."
            )

        if not consultation:
            raise HTTPException(
                status_code=404,
                detail="Consultation introuvable pour cet identifiant."
            )

        if consultation.get("npi") != administration.npi:
            raise HTTPException(
                status_code=400,
                detail="Le NPI fourni ne correspond pas au patient de cette consultation."
            )

    administration_dict = administration.model_dump()
    administration_dict["administre_par"] = current_user.email

    result = await administrations_collection.insert_one(administration_dict)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ADMINISTRATION_TRAITEMENT_VALIDEE",
        statut_action="SUCCES",
        npi_concerne=administration.npi
    )

    await publier_evenement("dmpi.administrations", {
        "type": "TRAITEMENT_ADMINISTRE",
        "npi": administration.npi,
        "nom_medicament": administration.nom_medicament,
        "auteur": current_user.email,
        "horodatage": datetime.utcnow().isoformat()
    })

    return {
        "message": "Administration du traitement validée avec succès !",
        "administration_id": str(result.inserted_id)
    }


@router.get("/administrations/patient/{npi}", response_model=list[AdministrationTraitement])
async def lister_administrations_patient(
    npi: str,
    current_user: User = Depends(get_current_user)
):
    """
    Historique des administrations de traitements validées pour un patient.
    """
    _valider_npi(npi)

    cursor = administrations_collection.find({"npi": npi}).sort("horodatage", -1)
    administrations = await cursor.to_list(length=200)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="LECTURE_ADMINISTRATIONS_TRAITEMENTS",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    return administrations


@router.get("/administrations/moi", response_model=list[AdministrationTraitement])
async def lister_mes_administrations(
    current_user: User = Depends(require_role("infirmier", "medecin"))
):
    """
    Historique des administrations de traitements validées par le
    professionnel connecté (du plus récent au plus ancien) — alimente le
    tableau de bord et l'historique personnel de l'infirmier.
    """
    cursor = administrations_collection.find(
        {"administre_par": current_user.email}
    ).sort("horodatage", -1)
    return await cursor.to_list(length=200)
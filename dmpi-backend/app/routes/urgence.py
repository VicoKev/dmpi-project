from fastapi import APIRouter, HTTPException, status, Depends
from app.database_mongo import dossiers_medicaux_collection
from app.schemas.dossier_medical import FicheUrgence
from app.security import require_role
from app.models_sql import User
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/urgence",
    tags=["Mode Urgence (Break the Glass)"]
)


@router.get("/{npi}", response_model=FicheUrgence)
async def acces_urgence(
    npi: str,
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """
    Protocole "Break the Glass" : accès exceptionnel et immédiat
    aux données vitales d'un patient en situation d'urgence.
    """
    if len(npi) != 10 or not npi.isdigit():
        raise HTTPException(
            status_code=400,
            detail="Le NPI doit être composé d'exactement 10 chiffres."
        )

    dossier = await dossiers_medicaux_collection.find_one({"npi": npi})

    if not dossier:
        await enregistrer_log(
            utilisateur_email=current_user.email,
            action="ACCES_URGENCE_BREAK_THE_GLASS",
            statut_action="ECHEC_DOSSIER_INTROUVABLE",
            npi_concerne=npi
        )
        raise HTTPException(
            status_code=404,
            detail=f"Aucun dossier médical trouvé pour le NPI : {npi}"
        )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ACCES_URGENCE_BREAK_THE_GLASS",
        statut_action="SUCCES_ACCES_EXCEPTIONNEL",
        npi_concerne=npi
    )

    return FicheUrgence(
        npi=dossier["npi"],
        groupe_sanguin=dossier.get("groupe_sanguin"),
        allergies=dossier.get("allergies", []),
        antecedents=dossier.get("antecedents", []),
        # Seuls les traitements toujours actifs ont leur place dans une vue
        # d'urgence — afficher un traitement arrêté laisserait croire au
        # médecin de garde que le patient le prend encore.
        traitements_en_cours=[t for t in dossier.get("traitements_en_cours", []) if t.get("actif", True)]
    )
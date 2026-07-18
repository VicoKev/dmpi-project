from fastapi import APIRouter, HTTPException, status, Depends
from app.database_mongo import consultations_collection
from app.schemas.consultation import ConsultationMongo
from app.security import get_current_user, require_role, verifier_acces_dossier_patient, verifier_acces_activite_medecin
from app.models_sql import User
from app.audit import enregistrer_log
from app.kafka_producer import publier_evenement
from datetime import datetime

router = APIRouter(
    prefix="/consultations",
    tags=["Consultations (MongoDB)"]
)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def enregistrer_consultation(
    consultation: ConsultationMongo,
    current_user: User = Depends(require_role("medecin"))
):
    """
    Endpoint du MVP : Saisie d'une nouvelle consultation médicale.
    Protégé, journalisé, et notifié en temps réel via Kafka.
    """
    consultation.releve_par = current_user.email
    consultation.etablissement_id = current_user.etablissement_id
    consultation_dict = consultation.model_dump()

    result = await consultations_collection.insert_one(consultation_dict)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_CONSULTATION",
        statut_action="SUCCES",
        npi_concerne=consultation.npi
    )

    await publier_evenement("dmpi.consultations", {
        "type": "NOUVELLE_CONSULTATION",
        "npi": consultation.npi,
        "consultation_id": str(result.inserted_id),
        "auteur": current_user.email,
        "diagnostic_cim10": consultation.diagnostic_cim10,
        "horodatage": datetime.utcnow().isoformat()
    })

    return {
        "message": "Consultation enregistrée avec succès !",
        "consultation_id": str(result.inserted_id),
        "npi_patient": consultation.npi
    }


@router.get("/patient/{npi}", response_model=list[ConsultationMongo])
async def lister_consultations_patient(
    npi: str,
    current_user: User = Depends(get_current_user)
):
    """
    Récupère tout l'historique des consultations d'un patient spécifique.
    Protégé et journalisé.
    """
    await verifier_acces_dossier_patient(current_user, npi)

    if len(npi) != 10 or not npi.isdigit():
        await enregistrer_log(
            utilisateur_email=current_user.email,
            action="LECTURE_HISTORIQUE_CONSULTATIONS",
            statut_action="ECHEC",
            npi_concerne=npi
        )
        raise HTTPException(
            status_code=400,
            detail="Le NPI doit être composé d'exactement 10 chiffres."
        )

    cursor = consultations_collection.find({"npi": npi})
    consultations = await cursor.to_list(length=100)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="LECTURE_HISTORIQUE_CONSULTATIONS",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    return consultations


@router.get("/medecin/{email}")
async def lister_consultations_medecin(
    email: str,
    current_user: User = Depends(get_current_user)
):
    """
    Récupère toutes les consultations enregistrées par un médecin spécifique (agenda).
    """
    await verifier_acces_activite_medecin(current_user, email)

    cursor = consultations_collection.find({"releve_par": email})
    consultations = await cursor.to_list(length=200)

    # Sérialiser les ObjectId
    result = []
    for c in consultations:
        c["_id"] = str(c["_id"])
        result.append(c)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="LECTURE_AGENDA_MEDECIN",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return result
from fastapi import APIRouter, HTTPException, status, Depends
from app.database_mongo import ordonnances_collection, dossiers_medicaux_collection
from app.schemas.ordonnance import OrdonnanceMongo
from app.security import get_current_user
from app.models_sql import User
from app.audit import enregistrer_log
from app.kafka_producer import publier_evenement
from datetime import datetime
from bson import ObjectId

router = APIRouter(
    prefix="/ordonnances",
    tags=["Ordonnances (MongoDB)"]
)

@router.post("/", status_code=status.HTTP_201_CREATED)
async def enregistrer_ordonnance(
    ordonnance: OrdonnanceMongo,
    current_user: User = Depends(get_current_user)
):
    ordonnance.auteur = current_user.email
    ordonnance_dict = ordonnance.model_dump()
    result = await ordonnances_collection.insert_one(ordonnance_dict)
    
    # Mettre à jour les traitements en cours dans le dossier médical
    if ordonnance.traitements:
        nouveaux_traitements = []
        for t in ordonnance.traitements:
            nouveaux_traitements.append({
                "nom_medicament": t.nom_medicament,
                "posologie": t.posologie,
                "indication": f"Prescrit le {datetime.utcnow().strftime('%d/%m/%Y')} (durée: {t.duree})"
            })
            
        await dossiers_medicaux_collection.update_one(
            {"npi": ordonnance.npi},
            {
                "$push": {"traitements_en_cours": {"$each": nouveaux_traitements}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_ORDONNANCE",
        statut_action="SUCCES",
        npi_concerne=ordonnance.npi
    )

    await publier_evenement("dmpi.consultations", {
        "type": "NOUVELLE_ORDONNANCE",
        "npi": ordonnance.npi,
        "ordonnance_id": str(result.inserted_id),
        "consultation_id": ordonnance.consultation_id,
        "auteur": current_user.email,
        "horodatage": datetime.utcnow().isoformat()
    })

    return {
        "message": "Ordonnance enregistrée avec succès !",
        "ordonnance_id": str(result.inserted_id),
        "npi_patient": ordonnance.npi
    }

@router.get("/patient/{npi}", response_model=list[OrdonnanceMongo])
async def lister_ordonnances_patient(
    npi: str,
    current_user: User = Depends(get_current_user)
):
    if len(npi) != 10 or not npi.isdigit():
        await enregistrer_log(
            utilisateur_email=current_user.email,
            action="LECTURE_HISTORIQUE_ORDONNANCES",
            statut_action="ECHEC",
            npi_concerne=npi
        )
        raise HTTPException(
            status_code=400,
            detail="Le NPI doit être composé de exactement 10 chiffres."
        )

    cursor = ordonnances_collection.find({"npi": npi}).sort("created_at", -1)
    ordonnances = await cursor.to_list(length=100)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="LECTURE_HISTORIQUE_ORDONNANCES",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    return ordonnances

@router.get("/medecin/{email}", response_model=list[OrdonnanceMongo])
async def lister_ordonnances_medecin(
    email: str,
    current_user: User = Depends(get_current_user)
):
    """
    Récupère toutes les ordonnances créées par un médecin.
    """
    cursor = ordonnances_collection.find({"auteur": email}).sort("created_at", -1)
    ordonnances = await cursor.to_list(length=200)
    return ordonnances

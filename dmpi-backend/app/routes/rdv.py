from fastapi import APIRouter, HTTPException, status, Depends
from app.database_mongo import get_mongo_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.security import get_current_user
from app.models_sql import User
from app.audit import enregistrer_log
from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId

router = APIRouter(
    prefix="/rdv",
    tags=["Rendez-vous"]
)


class RendezVousCreate(BaseModel):
    npi_patient: str = Field(..., min_length=10, max_length=10)
    nom_patient: str
    prenom_patient: str
    date_rdv: str          # ISO format: "2026-07-15T09:30:00"
    motif: str
    notes: str | None = None


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


@router.post("/", status_code=status.HTTP_201_CREATED)
async def creer_rendez_vous(
    rdv: RendezVousCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    """Planification d'un rendez-vous par un médecin ou infirmier."""
    doc = {
        "npi_patient": rdv.npi_patient,
        "nom_patient": rdv.nom_patient,
        "prenom_patient": rdv.prenom_patient,
        "date_rdv": rdv.date_rdv,
        "motif": rdv.motif,
        "notes": rdv.notes,
        "medecin_email": current_user.email,
        "medecin_nom": f"{current_user.prenom} {current_user.nom}",
        "statut": "confirme",   # confirme | annule | complete
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db["rendez_vous"].insert_one(doc)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_RDV",
        statut_action="SUCCES",
        npi_concerne=rdv.npi_patient
    )

    return {"message": "Rendez-vous planifié avec succès.", "rdv_id": str(result.inserted_id)}


@router.get("/patient/{npi}")
async def rdv_par_patient(
    npi: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    """Tous les RDV d'un patient (triés par date)."""
    cursor = db["rendez_vous"].find({"npi_patient": npi}).sort("date_rdv", 1)
    rdvs = await cursor.to_list(length=100)
    return [_serialize(r) for r in rdvs]


@router.get("/medecin/{email}")
async def rdv_par_medecin(
    email: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    """Tous les RDV planifiés par un médecin (triés par date)."""
    cursor = db["rendez_vous"].find({"medecin_email": email}).sort("date_rdv", 1)
    rdvs = await cursor.to_list(length=200)
    return [_serialize(r) for r in rdvs]


@router.patch("/{rdv_id}/annuler")
async def annuler_rendez_vous(
    rdv_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    """Annule un RDV existant."""
    result = await db["rendez_vous"].update_one(
        {"_id": ObjectId(rdv_id)},
        {"$set": {"statut": "annule"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ANNULATION_RDV",
        statut_action="SUCCES",
        npi_concerne=None
    )
    return {"message": "Rendez-vous annulé."}

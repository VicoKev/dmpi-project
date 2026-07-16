from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from app.database_mongo import get_mongo_db
from app.schemas.prestataire import PrestataireCreate, PrestataireUpdate, PrestataireOut
from app.models_sql import User
from app.security import require_role
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/prestataires",
    tags=["Prestataires partenaires (pharmacies, laboratoires)"]
)


def _formater(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/", response_model=list[PrestataireOut])
async def lister_prestataires(
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Liste tous les prestataires partenaires (pharmacies, laboratoires)."""
    prestataires = await db["prestataires_partenaires"].find().sort("nom", 1).to_list(1000)
    return [_formater(p) for p in prestataires]


@router.post("/", response_model=PrestataireOut, status_code=status.HTTP_201_CREATED)
async def creer_prestataire(
    prestataire: PrestataireCreate,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Création d'un prestataire partenaire (pharmacie, laboratoire...)."""
    maintenant = datetime.utcnow()
    nouveau_doc = prestataire.model_dump()
    nouveau_doc["created_at"] = maintenant
    nouveau_doc["updated_at"] = maintenant

    result = await db["prestataires_partenaires"].insert_one(nouveau_doc)
    created = await db["prestataires_partenaires"].find_one({"_id": result.inserted_id})

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_PRESTATAIRE_PARTENAIRE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return _formater(created)


@router.patch("/{prestataire_id}", response_model=PrestataireOut)
async def modifier_prestataire(
    prestataire_id: str,
    updates: PrestataireUpdate,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Modifier un prestataire partenaire."""
    if not ObjectId.is_valid(prestataire_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    update_data["updated_at"] = datetime.utcnow()

    result = await db["prestataires_partenaires"].update_one(
        {"_id": ObjectId(prestataire_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire introuvable")

    updated = await db["prestataires_partenaires"].find_one({"_id": ObjectId(prestataire_id)})

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="MODIFICATION_PRESTATAIRE_PARTENAIRE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return _formater(updated)


@router.delete("/{prestataire_id}")
async def desactiver_prestataire(
    prestataire_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Désactive un prestataire partenaire (soft delete — il n'apparaîtra plus dans les suggestions)."""
    if not ObjectId.is_valid(prestataire_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    result = await db["prestataires_partenaires"].update_one(
        {"_id": ObjectId(prestataire_id)},
        {"$set": {"statut": "inactif", "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire introuvable")

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="DESACTIVATION_PRESTATAIRE_PARTENAIRE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {"message": "Prestataire désactivé avec succès"}


@router.post("/{prestataire_id}/reactivate")
async def reactiver_prestataire(
    prestataire_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Réactive un prestataire partenaire."""
    if not ObjectId.is_valid(prestataire_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    result = await db["prestataires_partenaires"].update_one(
        {"_id": ObjectId(prestataire_id)},
        {"$set": {"statut": "actif", "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prestataire introuvable")

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="REACTIVATION_PRESTATAIRE_PARTENAIRE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {"message": "Prestataire réactivé avec succès"}

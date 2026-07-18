from fastapi import APIRouter, Depends, HTTPException, status, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from bson import ObjectId
from datetime import datetime
from app.database_mongo import get_mongo_db
from app.database_sql import get_sql_db
from app.schemas.prestataire import PrestataireCreate, PrestataireUpdate, PrestataireOut
from app.models_sql import User
from app.security import require_role, get_current_user
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
    response: Response,
    skip: int = 0,
    limit: int | None = None,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(get_current_user)
):
    """
    Liste tous les prestataires partenaires (pharmacies, laboratoires).
    Lecture ouverte à tout compte authentifié : un médecin doit pouvoir
    parcourir l'annuaire des laboratoires partenaires pour y prescrire un
    examen. Création/modification/suppression restent réservées au super admin.

    skip/limit optionnels : sans eux, comportement historique (liste
    complète), nécessaire aux sélecteurs ailleurs dans l'app. Total réel
    toujours renvoyé via l'en-tête X-Total-Count.
    """
    total = await db["prestataires_partenaires"].count_documents({})
    response.headers["X-Total-Count"] = str(total)

    cursor = db["prestataires_partenaires"].find().sort("nom", 1).skip(skip)
    if limit is not None:
        prestataires = await cursor.limit(min(limit, 200)).to_list(length=min(limit, 200))
    else:
        prestataires = await cursor.to_list(1000)
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
    db_sql: AsyncSession = Depends(get_sql_db),
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

    # Le prénom/nom d'un compte laboratoire est dérivé du nom et de la
    # commune de sa fiche partenaire (un laboratoire n'a pas d'identité
    # propre) — sans cette resynchronisation, renommer la fiche laisserait
    # les comptes déjà créés afficher l'ancien nom indéfiniment.
    if updated.get("type") == "laboratoire":
        nouveau_prenom = updated.get("nom")
        nouveau_nom = updated.get("commune") or updated.get("departement")
        if nouveau_prenom and nouveau_nom:
            comptes = await db_sql.execute(
                select(User).where(User.role == "laboratoire", User.prestataire_id == prestataire_id)
            )
            for compte in comptes.scalars().all():
                compte.prenom = nouveau_prenom
                compte.nom = nouveau_nom
            await db_sql.commit()

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

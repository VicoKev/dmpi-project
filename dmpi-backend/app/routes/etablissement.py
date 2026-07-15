from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime
from app.database_mongo import get_mongo_db
from app.schemas.etablissement import EtablissementCreate, EtablissementUpdate, EtablissementUpdateSelfService, EtablissementOut
from app.models_sql import User
from app.security import require_role
from app.audit import enregistrer_log

router = APIRouter(
    prefix="/etablissements",
    tags=["Etablissements"]
)

def format_etablissement(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database_sql import get_sql_db
from datetime import datetime


async def _obtenir_directeur(db_sql: AsyncSession, etablissement_id: str) -> str | None:
    """Le 'directeur' d'un établissement est calculé depuis le(s) compte(s)
    admin_etablissement qui lui sont rattachés — il n'est jamais saisi à la main."""
    result = await db_sql.execute(
        select(User).where(User.etablissement_id == etablissement_id, User.role == "admin_etablissement")
    )
    admins = result.scalars().all()
    if not admins:
        return None
    return ", ".join(f"{a.prenom} {a.nom}" for a in admins)

@router.get("/", response_model=list[EtablissementOut])
async def lister_etablissements(
    db_mongo: AsyncIOMotorDatabase = Depends(get_mongo_db),
    db_sql: AsyncSession = Depends(get_sql_db)
):
    """Liste tous les établissements de santé."""
    etablissements = await db_mongo["etablissements"].find().to_list(1000)
    
    # Effectifs (PostgreSQL)
    stmt = select(User.etablissement_id, User.role, func.count()).where(User.etablissement_id.is_not(None)).group_by(User.etablissement_id, User.role)
    result = await db_sql.execute(stmt)
    role_counts = result.all()
    
    sql_stats = {}
    for etab_id, role, count in role_counts:
        if etab_id not in sql_stats:
            sql_stats[etab_id] = {"medecins": 0, "infirmiers": 0}
        if role == "medecin":
            sql_stats[etab_id]["medecins"] = count
        elif role == "infirmier":
            sql_stats[etab_id]["infirmiers"] = count

    # Directeur = compte(s) admin_etablissement rattaché(s) (PostgreSQL)
    stmt_admins = select(User.etablissement_id, User.prenom, User.nom).where(
        User.role == "admin_etablissement", User.etablissement_id.is_not(None)
    )
    result_admins = await db_sql.execute(stmt_admins)
    directeurs: dict[str, list[str]] = {}
    for etab_id, prenom, nom in result_admins.all():
        directeurs.setdefault(etab_id, []).append(f"{prenom} {nom}")

    # Activité du mois (MongoDB) - Exactement comme /dashboard/national
    maintenant = datetime.utcnow()
    debut_mois = datetime(maintenant.year, maintenant.month, 1)
    
    pipeline_etabs = [
        {"$match": {"created_at": {"$gte": debut_mois}}},
        {"$group": {
            "_id": "$etablissement_id",
            "consultations_du_mois": {"$sum": 1},
            "npi_uniques": {"$addToSet": "$npi"}
        }},
        {"$project": {
            "etablissement_id": "$_id",
            "consultations_du_mois": 1,
            "patients_total": {"$size": "$npi_uniques"}
        }}
    ]
    
    agg_cursor = db_mongo["consultations"].aggregate(pipeline_etabs)
    agg_results = await agg_cursor.to_list(length=None)
    
    mongo_stats = {
        res["_id"]: {
            "consultations_du_mois": res["consultations_du_mois"],
            "patients_total": res.get("patients_total", 0)
        } for res in agg_results if res["_id"] is not None
    }

    result_list = []
    for e in etablissements:
        e_id = str(e["_id"])
        m_stats = mongo_stats.get(e_id, {"consultations_du_mois": 0, "patients_total": 0})
        s_stats = sql_stats.get(e_id, {"medecins": 0, "infirmiers": 0})
        
        e["patients"] = m_stats["patients_total"]
        e["consultationsMois"] = m_stats["consultations_du_mois"]
        e["medecins"] = s_stats["medecins"]
        e["infirmiers"] = s_stats["infirmiers"]
        e["directeur"] = ", ".join(directeurs.get(e_id, [])) or None
        
        result_list.append(format_etablissement(e))
        
    return result_list

@router.post("/", response_model=EtablissementOut, status_code=status.HTTP_201_CREATED)
async def creer_etablissement(
    etablissement: EtablissementCreate,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Création d'un établissement."""
    nouveau_doc = etablissement.model_dump()
    nouveau_doc["derniereSync"] = datetime.utcnow()

    result = await db["etablissements"].insert_one(nouveau_doc)
    created = await db["etablissements"].find_one({"_id": result.inserted_id})
    created["directeur"] = await _obtenir_directeur(db_sql, str(result.inserted_id))

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_ETABLISSEMENT",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return format_etablissement(created)

@router.get("/moi", response_model=EtablissementOut)
async def obtenir_mon_etablissement(
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("admin_etablissement"))
):
    """Fiche de l'établissement de l'admin connecté (résolu depuis son compte, pas depuis l'URL)."""
    if not current_user.etablissement_id or not ObjectId.is_valid(current_user.etablissement_id):
        raise HTTPException(status_code=404, detail="Votre compte n'est rattaché à aucun établissement.")

    etab = await db["etablissements"].find_one({"_id": ObjectId(current_user.etablissement_id)})
    if not etab:
        raise HTTPException(status_code=404, detail="Établissement introuvable.")

    etab["directeur"] = await _obtenir_directeur(db_sql, current_user.etablissement_id)
    return format_etablissement(etab)


@router.patch("/moi", response_model=EtablissementOut)
async def modifier_mon_etablissement(
    updates: EtablissementUpdateSelfService,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("admin_etablissement"))
):
    """
    Un admin_etablissement ne peut modifier que la localisation/coordonnées de
    son propre établissement — nom, type, statut restent la gouvernance du
    super_admin (voir EtablissementUpdateSelfService).
    """
    if not current_user.etablissement_id or not ObjectId.is_valid(current_user.etablissement_id):
        raise HTTPException(status_code=404, detail="Votre compte n'est rattaché à aucun établissement.")

    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    update_data["derniereSync"] = datetime.utcnow()

    result = await db["etablissements"].update_one(
        {"_id": ObjectId(current_user.etablissement_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Établissement introuvable.")

    updated = await db["etablissements"].find_one({"_id": ObjectId(current_user.etablissement_id)})
    updated["directeur"] = await _obtenir_directeur(db_sql, current_user.etablissement_id)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="MODIFICATION_MON_ETABLISSEMENT",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return format_etablissement(updated)


@router.patch("/{etablissement_id}", response_model=EtablissementOut)
async def modifier_etablissement(
    etablissement_id: str,
    updates: EtablissementUpdate,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Modifier un établissement."""
    if not ObjectId.is_valid(etablissement_id):
        raise HTTPException(status_code=400, detail="ID invalide")

    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")

    update_data["derniereSync"] = datetime.utcnow()

    result = await db["etablissements"].update_one(
        {"_id": ObjectId(etablissement_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Etablissement introuvable")
        
    updated = await db["etablissements"].find_one({"_id": ObjectId(etablissement_id)})
    updated["directeur"] = await _obtenir_directeur(db_sql, etablissement_id)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="MODIFICATION_ETABLISSEMENT",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return format_etablissement(updated)

@router.delete("/{etablissement_id}")
async def supprimer_etablissement(
    etablissement_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Désactive un établissement (soft delete)."""
    if not ObjectId.is_valid(etablissement_id):
        raise HTTPException(status_code=400, detail="ID invalide")
        
    result = await db["etablissements"].update_one(
        {"_id": ObjectId(etablissement_id)},
        {"$set": {"statut": "inactif", "derniereSync": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Etablissement introuvable")
        
    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="DESACTIVATION_ETABLISSEMENT",
        statut_action="SUCCES",
        npi_concerne=None
    )
    
    return {"message": "Établissement désactivé avec succès"}

@router.post("/{etablissement_id}/reactivate")
async def reactiver_etablissement(
    etablissement_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user: User = Depends(require_role("super_admin"))
):
    """Réactive un établissement."""
    if not ObjectId.is_valid(etablissement_id):
        raise HTTPException(status_code=400, detail="ID invalide")
        
    result = await db["etablissements"].update_one(
        {"_id": ObjectId(etablissement_id)},
        {"$set": {"statut": "actif", "derniereSync": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Etablissement introuvable")
        
    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="REACTIVATION_ETABLISSEMENT",
        statut_action="SUCCES",
        npi_concerne=None
    )
    
    return {"message": "Établissement réactivé avec succès"}

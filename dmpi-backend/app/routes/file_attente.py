from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime

from app.database_sql import get_sql_db
from app.database_mongo import dossiers_medicaux_collection, file_attente_collection
from app.models_sql import User
from app.schemas.file_attente import FileAttenteCreate, AssignerMedecinRequest, DisponibiliteRequest, FileAttenteOut
from app.security import require_role
from app.audit import enregistrer_log
from app.kafka_producer import publier_evenement

router = APIRouter(
    prefix="/file-attente",
    tags=["File d'attente (pré-consultation)"]
)


def _serialiser(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _medecin_actif_de_letablissement(db: AsyncSession, medecin_email: str, etablissement_id: str | None) -> User:
    result = await db.execute(
        select(User).where(
            User.email == medecin_email,
            User.role == "medecin",
            User.est_actif == True  # noqa: E712
        )
    )
    medecin = result.scalar_one_or_none()
    if not medecin:
        raise HTTPException(status_code=400, detail="Médecin introuvable ou inactif.")
    if etablissement_id and medecin.etablissement_id != etablissement_id:
        raise HTTPException(status_code=400, detail="Ce médecin n'est pas rattaché à votre établissement.")
    if not medecin.disponible:
        raise HTTPException(status_code=400, detail="Ce médecin s'est déclaré indisponible.")
    return medecin


@router.post("/", response_model=FileAttenteOut, status_code=status.HTTP_201_CREATED)
async def ajouter_a_la_file_attente(
    entree: FileAttenteCreate,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("infirmier"))
):
    """
    Enregistre un patient en pré-consultation. Si medecin_email est fourni,
    l'entrée est directement assignée ; sinon elle reste "en_attente" pour
    assignation ultérieure via /file-attente/{id}/assigner.
    """
    if not current_user.etablissement_id:
        raise HTTPException(status_code=400, detail="Votre compte n'est rattaché à aucun établissement.")

    dossier = await dossiers_medicaux_collection.find_one({"npi": entree.npi})
    if not dossier:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun dossier médical trouvé pour le NPI {entree.npi}."
        )

    maintenant = datetime.utcnow()
    statut = "en_attente"
    date_assignation = None

    if entree.medecin_email:
        await _medecin_actif_de_letablissement(db, entree.medecin_email, current_user.etablissement_id)
        statut = "assigne"
        date_assignation = maintenant

    document = {
        "npi": entree.npi,
        "nom": dossier.get("nom") or "Patient",
        "prenom": dossier.get("prenom") or "",
        "etablissement_id": current_user.etablissement_id,
        "infirmier_email": current_user.email,
        "medecin_email": entree.medecin_email,
        "motif_bref": entree.motif_bref,
        "priorite": entree.priorite if entree.priorite in ("normale", "urgente") else "normale",
        "statut": statut,
        "date_creation": maintenant,
        "date_assignation": date_assignation,
        "date_prise_en_charge": None,
        "date_fin": None,
    }

    result = await file_attente_collection.insert_one(document)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="AJOUT_FILE_ATTENTE",
        statut_action="SUCCES",
        npi_concerne=entree.npi
    )

    await publier_evenement("dmpi.file_attente", {
        "type": "PATIENT_ASSIGNE" if statut == "assigne" else "PATIENT_EN_ATTENTE",
        "npi": entree.npi,
        "medecin_email": entree.medecin_email,
        "infirmier_email": current_user.email,
        "horodatage": maintenant.isoformat()
    })

    return _serialiser(document | {"_id": result.inserted_id})


@router.get("/etablissement", response_model=list[FileAttenteOut])
async def lister_file_attente_etablissement(
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """File d'attente courante (en_attente + assigné) de l'établissement du professionnel connecté."""
    if not current_user.etablissement_id:
        return []

    cursor = file_attente_collection.find({
        "etablissement_id": current_user.etablissement_id,
        "statut": {"$in": ["en_attente", "assigne"]}
    })
    entrees = await cursor.to_list(length=200)
    entrees.sort(key=lambda e: (e["priorite"] != "urgente", e["date_creation"]))

    return [_serialiser(e) for e in entrees]


@router.get("/mes-patients", response_model=list[FileAttenteOut])
async def lister_mes_patients_assignes(
    current_user: User = Depends(require_role("medecin"))
):
    """Patients actuellement assignés au médecin connecté (assignés ou en consultation)."""
    cursor = file_attente_collection.find({
        "medecin_email": current_user.email,
        "statut": {"$in": ["assigne", "en_consultation"]}
    })
    entrees = await cursor.to_list(length=200)
    entrees.sort(key=lambda e: (e["priorite"] != "urgente", e.get("date_assignation") or e["date_creation"]))

    return [_serialiser(e) for e in entrees]


@router.get("/medecins-disponibles")
async def lister_medecins_disponibles(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("infirmier"))
):
    """Médecins actifs de l'établissement de l'infirmier connecté, pour l'assignation."""
    if not current_user.etablissement_id:
        return []

    result = await db.execute(
        select(User).where(
            User.role == "medecin",
            User.etablissement_id == current_user.etablissement_id,
            User.est_actif == True  # noqa: E712
        )
    )
    medecins = result.scalars().all()
    return [
        {"email": m.email, "nom": m.nom, "prenom": m.prenom, "specialite": m.specialite, "disponible": m.disponible}
        for m in medecins
    ]


@router.get("/ma-disponibilite")
async def obtenir_ma_disponibilite(
    current_user: User = Depends(require_role("medecin"))
):
    return {"disponible": current_user.disponible}


@router.patch("/ma-disponibilite")
async def definir_ma_disponibilite(
    payload: DisponibiliteRequest,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("medecin"))
):
    current_user.disponible = payload.disponible
    db.add(current_user)
    await db.commit()
    return {"disponible": current_user.disponible}


def _trouver_object_id(entree_id: str) -> ObjectId:
    try:
        return ObjectId(entree_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant d'entrée invalide.")


@router.patch("/{entree_id}/assigner", response_model=FileAttenteOut)
async def assigner_medecin(
    entree_id: str,
    payload: AssignerMedecinRequest,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(require_role("infirmier"))
):
    entree = await file_attente_collection.find_one({"_id": _trouver_object_id(entree_id)})
    if not entree:
        raise HTTPException(status_code=404, detail="Entrée introuvable.")
    if entree["statut"] != "en_attente":
        raise HTTPException(status_code=400, detail="Cette entrée n'est plus en attente d'assignation.")

    await _medecin_actif_de_letablissement(db, payload.medecin_email, entree.get("etablissement_id"))

    maintenant = datetime.utcnow()
    await file_attente_collection.update_one(
        {"_id": entree["_id"]},
        {"$set": {"statut": "assigne", "medecin_email": payload.medecin_email, "date_assignation": maintenant}}
    )

    await publier_evenement("dmpi.file_attente", {
        "type": "PATIENT_ASSIGNE",
        "npi": entree["npi"],
        "medecin_email": payload.medecin_email,
        "infirmier_email": current_user.email,
        "horodatage": maintenant.isoformat()
    })

    maj = await file_attente_collection.find_one({"_id": entree["_id"]})
    return _serialiser(maj)


@router.patch("/{entree_id}/demarrer", response_model=FileAttenteOut)
async def demarrer_consultation(
    entree_id: str,
    current_user: User = Depends(require_role("medecin"))
):
    entree = await file_attente_collection.find_one({"_id": _trouver_object_id(entree_id)})
    if not entree:
        raise HTTPException(status_code=404, detail="Entrée introuvable.")
    if entree.get("medecin_email") != current_user.email:
        raise HTTPException(status_code=403, detail="Ce patient n'est pas assigné à votre compte.")
    if entree["statut"] != "assigne":
        raise HTTPException(status_code=400, detail="Cette entrée n'est pas en attente de prise en charge.")

    maintenant = datetime.utcnow()
    await file_attente_collection.update_one(
        {"_id": entree["_id"]},
        {"$set": {"statut": "en_consultation", "date_prise_en_charge": maintenant}}
    )

    maj = await file_attente_collection.find_one({"_id": entree["_id"]})
    return _serialiser(maj)


@router.patch("/{entree_id}/terminer", response_model=FileAttenteOut)
async def terminer_prise_en_charge(
    entree_id: str,
    current_user: User = Depends(require_role("medecin"))
):
    entree = await file_attente_collection.find_one({"_id": _trouver_object_id(entree_id)})
    if not entree:
        raise HTTPException(status_code=404, detail="Entrée introuvable.")
    if entree.get("medecin_email") != current_user.email:
        raise HTTPException(status_code=403, detail="Ce patient n'est pas assigné à votre compte.")
    if entree["statut"] != "en_consultation":
        raise HTTPException(status_code=400, detail="Cette entrée n'est pas en cours de consultation.")

    maintenant = datetime.utcnow()
    await file_attente_collection.update_one(
        {"_id": entree["_id"]},
        {"$set": {"statut": "termine", "date_fin": maintenant}}
    )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="FIN_PRISE_EN_CHARGE_FILE_ATTENTE",
        statut_action="SUCCES",
        npi_concerne=entree["npi"]
    )

    maj = await file_attente_collection.find_one({"_id": entree["_id"]})
    return _serialiser(maj)

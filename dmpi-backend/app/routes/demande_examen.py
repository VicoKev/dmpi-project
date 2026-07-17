from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime

from app.database_mongo import demandes_examen_collection, prestataires_partenaires_collection
from app.schemas.demande_examen import DemandeExamenCreate, DemandeExamenOut
from app.security import get_current_user, require_role
from app.models_sql import User
from app.audit import enregistrer_log
from app.types_examen_data import TYPES_EXAMEN

router = APIRouter(
    prefix="/demandes-examen",
    tags=["Demandes d'examen"]
)


@router.get("/types-disponibles")
async def lister_types_examen_disponibles(
    current_user: User = Depends(require_role("medecin"))
):
    """Catalogue fermé des types d'examen prescriptibles, groupés par catégorie."""
    return TYPES_EXAMEN


async def _enrichir(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    prestataire = await prestataires_partenaires_collection.find_one({"_id": ObjectId(doc["prestataire_id"])}) \
        if ObjectId.is_valid(doc["prestataire_id"]) else None
    doc["prestataire_nom"] = prestataire.get("nom") if prestataire else None
    return doc


@router.post("/", response_model=DemandeExamenOut, status_code=status.HTTP_201_CREATED)
async def creer_demande_examen(
    demande: DemandeExamenCreate,
    current_user: User = Depends(require_role("medecin"))
):
    """
    Prescription d'un examen (radiographie, scanner, analyse de laboratoire...)
    à réaliser par un laboratoire partenaire déjà enregistré dans l'annuaire
    des partenaires (pas de saisie libre). Non rattachée à une consultation
    précise — un patient peut avoir de nombreuses consultations au fil du
    temps, et exiger d'en choisir une systématiquement alourdirait inutilement
    la prescription.
    """
    if not ObjectId.is_valid(demande.prestataire_id):
        raise HTTPException(status_code=400, detail="Identifiant de laboratoire invalide.")

    prestataire = await prestataires_partenaires_collection.find_one({"_id": ObjectId(demande.prestataire_id)})
    if not prestataire:
        raise HTTPException(status_code=404, detail="Laboratoire introuvable.")
    if prestataire.get("type") != "laboratoire":
        raise HTTPException(status_code=400, detail="Ce prestataire n'est pas enregistré comme laboratoire.")
    if prestataire.get("statut") != "actif":
        raise HTTPException(status_code=400, detail="Ce laboratoire n'est plus actif.")

    nouvelle_demande = {
        "npi": demande.npi,
        "prestataire_id": demande.prestataire_id,
        "type_examen": demande.type_examen,
        "motif": demande.motif,
        "medecin_email": current_user.email,
        "statut": "en_attente",
        "created_at": datetime.utcnow(),
    }
    result = await demandes_examen_collection.insert_one(nouvelle_demande)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CREATION_DEMANDE_EXAMEN",
        statut_action="SUCCES",
        npi_concerne=demande.npi
    )

    cree = await demandes_examen_collection.find_one({"_id": result.inserted_id})
    return await _enrichir(cree)


@router.get("/patient/{npi}", response_model=list[DemandeExamenOut])
async def lister_demandes_patient(
    npi: str,
    current_user: User = Depends(get_current_user)
):
    """Médecin/infirmier : accès libre (contexte clinique). Patient : uniquement son propre NPI."""
    if current_user.role == "patient" and current_user.npi_patient != npi:
        raise HTTPException(status_code=403, detail="Accès non autorisé à ce dossier.")
    if current_user.role not in ("medecin", "infirmier", "patient"):
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    cursor = demandes_examen_collection.find({"npi": npi}).sort("created_at", -1)
    demandes = await cursor.to_list(length=200)
    return [await _enrichir(d) for d in demandes]


@router.get("/mes-demandes", response_model=list[DemandeExamenOut])
async def mes_demandes_laboratoire(
    current_user: User = Depends(require_role("laboratoire"))
):
    """Demandes d'examen adressées au laboratoire du compte connecté."""
    if not current_user.prestataire_id:
        raise HTTPException(status_code=400, detail="Ce compte n'est rattaché à aucun laboratoire.")

    cursor = demandes_examen_collection.find({"prestataire_id": current_user.prestataire_id}).sort("created_at", -1)
    demandes = await cursor.to_list(length=200)
    return [await _enrichir(d) for d in demandes]

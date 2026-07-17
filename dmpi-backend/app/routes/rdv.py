from fastapi import APIRouter, HTTPException, status, Depends
from app.database_mongo import rendez_vous_collection, dossiers_medicaux_collection
from app.security import get_current_user, require_role
from app.models_sql import User
from app.audit import enregistrer_log
from app.schemas.rdv import RendezVousCreate, RendezVousUpdate, SignalerEmpechementRequest
from datetime import datetime, timedelta
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(
    prefix="/rdv",
    tags=["Rendez-vous"]
)


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    doc.setdefault("duree_minutes", 30)
    # en_attente | confirme | empechement — reconnaissance du patient,
    # distincte du statut administratif (confirme/annule/complete) : un
    # médecin planifie le rendez-vous, mais le patient doit pouvoir signaler
    # que ça ne lui convient pas plutôt que de subir une décision à sens unique.
    doc.setdefault("confirmation_patient", "en_attente")
    doc.setdefault("message_empechement", None)
    return doc


def _object_id(rdv_id: str) -> ObjectId:
    try:
        return ObjectId(rdv_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant de rendez-vous invalide.")


async def _verifier_conflit(medecin_email: str, date_rdv: datetime, duree_minutes: int, exclure_id: str | None = None) -> None:
    """
    Refuse un créneau qui chevauche un autre rendez-vous confirmé du même
    médecin. On ne compare qu'aux rendez-vous du même jour (bornage large
    sur la chaîne ISO, correcte lexicographiquement, avant le calcul précis
    du chevauchement en Python).
    """
    debut_jour = date_rdv.strftime("%Y-%m-%dT00:00:00")
    fin_jour = date_rdv.strftime("%Y-%m-%dT23:59:59")
    cursor = rendez_vous_collection.find({
        "medecin_email": medecin_email,
        "statut": "confirme",
        "date_rdv": {"$gte": debut_jour, "$lte": fin_jour},
    })
    debut_nouveau = date_rdv
    fin_nouveau = date_rdv + timedelta(minutes=duree_minutes)
    async for autre in cursor:
        if exclure_id and str(autre["_id"]) == exclure_id:
            continue
        debut_autre = datetime.fromisoformat(autre["date_rdv"])
        fin_autre = debut_autre + timedelta(minutes=autre.get("duree_minutes", 30))
        if debut_nouveau < fin_autre and debut_autre < fin_nouveau:
            raise HTTPException(
                status_code=409,
                detail=f"Ce créneau chevauche un autre rendez-vous confirmé à "
                       f"{debut_autre.strftime('%H:%M')} le même jour."
            )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def creer_rendez_vous(
    rdv: RendezVousCreate,
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """Planification d'un rendez-vous par un médecin ou infirmier."""
    dossier = await dossiers_medicaux_collection.find_one({"npi": rdv.npi_patient})
    if not dossier:
        raise HTTPException(status_code=404, detail="Aucun dossier patient ne correspond à ce NPI.")

    await _verifier_conflit(current_user.email, rdv.date_rdv, rdv.duree_minutes)

    doc = {
        "npi_patient": rdv.npi_patient,
        "nom_patient": rdv.nom_patient,
        "prenom_patient": rdv.prenom_patient,
        "date_rdv": rdv.date_rdv.isoformat(),
        "duree_minutes": rdv.duree_minutes,
        "motif": rdv.motif,
        "notes": rdv.notes,
        "medecin_email": current_user.email,
        "medecin_nom": f"{current_user.prenom} {current_user.nom}",
        "statut": "confirme",   # confirme | annule | complete
        "confirmation_patient": "en_attente",
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await rendez_vous_collection.insert_one(doc)

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
    current_user: User = Depends(get_current_user)
):
    """Tous les RDV d'un patient (triés par date)."""
    cursor = rendez_vous_collection.find({"npi_patient": npi}).sort("date_rdv", 1)
    rdvs = await cursor.to_list(length=100)
    return [_serialize(r) for r in rdvs]


@router.get("/medecin/{email}")
async def rdv_par_medecin(
    email: str,
    current_user: User = Depends(get_current_user)
):
    """Tous les RDV planifiés par un médecin (triés par date)."""
    cursor = rendez_vous_collection.find({"medecin_email": email}).sort("date_rdv", 1)
    rdvs = await cursor.to_list(length=200)
    return [_serialize(r) for r in rdvs]


@router.patch("/{rdv_id}")
async def modifier_rendez_vous(
    rdv_id: str,
    modification: RendezVousUpdate,
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """Reprogramme un rendez-vous existant (date, durée, motif, notes)."""
    object_id = _object_id(rdv_id)
    rdv = await rendez_vous_collection.find_one({"_id": object_id})
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")
    if rdv["medecin_email"] != current_user.email:
        raise HTTPException(status_code=403, detail="Seul le médecin ayant planifié ce rendez-vous peut le modifier.")
    if rdv["statut"] != "confirme":
        raise HTTPException(status_code=400, detail="Seul un rendez-vous confirmé peut être reprogrammé.")

    await _verifier_conflit(current_user.email, modification.date_rdv, modification.duree_minutes, exclure_id=rdv_id)

    await rendez_vous_collection.update_one(
        {"_id": object_id},
        {"$set": {
            "date_rdv": modification.date_rdv.isoformat(),
            "duree_minutes": modification.duree_minutes,
            "motif": modification.motif,
            "notes": modification.notes,
            # Le patient avait éventuellement confirmé l'ancien créneau — pas
            # le nouveau. On lui redemande sa disponibilité.
            "confirmation_patient": "en_attente",
            "message_empechement": None,
        }}
    )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="MODIFICATION_RDV",
        statut_action="SUCCES",
        npi_concerne=rdv["npi_patient"]
    )
    return {"message": "Rendez-vous reprogrammé avec succès."}


@router.patch("/{rdv_id}/annuler")
async def annuler_rendez_vous(
    rdv_id: str,
    current_user: User = Depends(get_current_user)
):
    """Annule un RDV existant — réservé au médecin l'ayant planifié, à un
    infirmier/administratif, ou au patient concerné."""
    object_id = _object_id(rdv_id)
    rdv = await rendez_vous_collection.find_one({"_id": object_id})
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")

    autorise = (
        current_user.role in ("medecin", "infirmier", "admin_etablissement", "super_admin")
        or (current_user.role == "patient" and current_user.npi_patient == rdv["npi_patient"])
    )
    if not autorise:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à annuler ce rendez-vous.")

    result = await rendez_vous_collection.update_one(
        {"_id": object_id},
        {"$set": {"statut": "annule"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ANNULATION_RDV",
        statut_action="SUCCES",
        npi_concerne=rdv["npi_patient"]
    )
    return {"message": "Rendez-vous annulé."}


@router.patch("/{rdv_id}/terminer")
async def terminer_rendez_vous(
    rdv_id: str,
    current_user: User = Depends(require_role("medecin", "infirmier"))
):
    """Marque un rendez-vous passé comme effectué."""
    object_id = _object_id(rdv_id)
    rdv = await rendez_vous_collection.find_one({"_id": object_id})
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")
    if rdv["statut"] != "confirme":
        raise HTTPException(status_code=400, detail="Seul un rendez-vous confirmé peut être marqué comme effectué.")
    if datetime.fromisoformat(rdv["date_rdv"]) > datetime.utcnow():
        raise HTTPException(status_code=400, detail="Ce rendez-vous n'a pas encore eu lieu.")

    await rendez_vous_collection.update_one(
        {"_id": object_id},
        {"$set": {"statut": "complete"}}
    )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="RDV_MARQUE_EFFECTUE",
        statut_action="SUCCES",
        npi_concerne=rdv["npi_patient"]
    )
    return {"message": "Rendez-vous marqué comme effectué."}


async def _rdv_du_patient_concerne(rdv_id: str, current_user: User) -> dict:
    """Charge le RDV et vérifie qu'il appartient bien au patient connecté,
    qu'il est toujours actif et qu'il n'a pas déjà eu lieu — commun aux deux
    actions de reconnaissance patient ci-dessous."""
    object_id = _object_id(rdv_id)
    rdv = await rendez_vous_collection.find_one({"_id": object_id})
    if not rdv:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")
    if current_user.npi_patient != rdv["npi_patient"]:
        raise HTTPException(status_code=403, detail="Ce rendez-vous ne vous concerne pas.")
    if rdv["statut"] != "confirme":
        raise HTTPException(status_code=400, detail="Ce rendez-vous n'est plus actif.")
    if datetime.fromisoformat(rdv["date_rdv"]) <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Ce rendez-vous est déjà passé.")
    return rdv


@router.patch("/{rdv_id}/confirmer-presence")
async def confirmer_presence(
    rdv_id: str,
    current_user: User = Depends(require_role("patient"))
):
    """Le patient confirme que le créneau lui convient — efface un éventuel
    empêchement signalé précédemment, devenu obsolète."""
    rdv = await _rdv_du_patient_concerne(rdv_id, current_user)
    await rendez_vous_collection.update_one(
        {"_id": rdv["_id"]},
        {"$set": {"confirmation_patient": "confirme", "message_empechement": None}}
    )
    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="RDV_PRESENCE_CONFIRMEE",
        statut_action="SUCCES",
        npi_concerne=rdv["npi_patient"]
    )
    return {"message": "Présence confirmée."}


@router.patch("/{rdv_id}/signaler-empechement")
async def signaler_empechement(
    rdv_id: str,
    body: SignalerEmpechementRequest | None = None,
    current_user: User = Depends(require_role("patient"))
):
    """Le patient signale que le créneau ne lui convient pas — le
    rendez-vous reste actif (le médecin garde la main pour l'annuler ou le
    reprogrammer), seule la reconnaissance du patient change. Le message
    optionnel permet au médecin de savoir s'il doit attendre une nouvelle
    disponibilité ou reprogrammer directement, plutôt que de deviner."""
    rdv = await _rdv_du_patient_concerne(rdv_id, current_user)
    message = body.message.strip() if body and body.message else None
    await rendez_vous_collection.update_one(
        {"_id": rdv["_id"]},
        {"$set": {"confirmation_patient": "empechement", "message_empechement": message or None}}
    )
    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="RDV_EMPECHEMENT_SIGNALE",
        statut_action="SUCCES",
        npi_concerne=rdv["npi_patient"]
    )
    return {"message": "Empêchement signalé au médecin."}

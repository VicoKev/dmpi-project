from fastapi import APIRouter, HTTPException, status, Depends, Form, File, UploadFile
from fastapi.responses import FileResponse
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime

from app.database_mongo import documents_medicaux_collection, demandes_examen_collection
from app.schemas.document_medical import DocumentMedicalOut, TYPES_DOCUMENT_VALIDES, InterpretationUpdate
from app.security import get_current_user, require_role, verifier_acces_dossier_patient
from app.models_sql import User
from app.audit import enregistrer_log
from app.stockage_fichiers import sauvegarder_fichier, chemin_absolu, supprimer_fichier

router = APIRouter(
    prefix="/documents-medicaux",
    tags=["Documents médicaux"]
)


def _formater(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    for f in doc.get("fichiers", []):
        f["id"] = f["chemin_stockage"]
        f["a_une_vignette"] = f.get("vignette_chemin") is not None
    return doc


@router.post("/", response_model=DocumentMedicalOut, status_code=status.HTTP_201_CREATED)
async def uploader_document(
    npi: str = Form(..., min_length=10, max_length=10),
    demande_examen_id: str | None = Form(None),
    type: str = Form(...),
    libelle: str = Form(...),
    date_realisation: str = Form(...),
    laboratoire_nom: str | None = Form(None),
    commentaire: str | None = Form(None),
    fichiers: list[UploadFile] = File(...),
    current_user: User = Depends(require_role("medecin", "laboratoire"))
):
    """
    Dépôt d'un document médical (radiographie, scanner, résultat de labo...).
    - Médecin : upload libre, ou rattaché à une demande d'examen qu'il a lui-même prescrite.
    - Laboratoire : upload possible UNIQUEMENT pour une demande qui lui est adressée
      (vérifié via prestataire_id) et encore en attente — jamais d'upload libre.
    """
    if type not in TYPES_DOCUMENT_VALIDES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de document invalide. Valeurs autorisées : {', '.join(TYPES_DOCUMENT_VALIDES)}."
        )

    try:
        date_realisation_dt = datetime.fromisoformat(date_realisation)
    except ValueError:
        raise HTTPException(status_code=400, detail="Date de réalisation invalide (format attendu : AAAA-MM-JJ).")

    if len(fichiers) == 0:
        raise HTTPException(status_code=400, detail="Au moins un fichier est requis.")
    if len(fichiers) > 5:
        raise HTTPException(status_code=400, detail="5 fichiers maximum par dépôt.")

    prestataire_id: str | None = None
    demande = None

    if demande_examen_id:
        try:
            demande_object_id = ObjectId(demande_examen_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Identifiant de demande d'examen invalide.")
        demande = await demandes_examen_collection.find_one({"_id": demande_object_id})
        if not demande:
            raise HTTPException(status_code=404, detail="Demande d'examen introuvable.")
        if demande.get("npi") != npi:
            raise HTTPException(status_code=400, detail="Cette demande d'examen ne concerne pas ce patient.")
        prestataire_id = demande.get("prestataire_id")

    if current_user.role == "laboratoire":
        if not current_user.prestataire_id:
            raise HTTPException(status_code=400, detail="Ce compte n'est rattaché à aucun laboratoire.")
        if not demande:
            raise HTTPException(
                status_code=403,
                detail="Un laboratoire ne peut déposer un résultat que pour une demande d'examen qui lui est adressée."
            )
        if demande.get("prestataire_id") != current_user.prestataire_id:
            raise HTTPException(status_code=403, detail="Cette demande d'examen n'est pas adressée à votre laboratoire.")
        if demande.get("statut") == "traitee":
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée.")

    fichiers_sauvegardes = [await sauvegarder_fichier(f) for f in fichiers]

    nouveau_document = {
        "npi": npi,
        "demande_examen_id": demande_examen_id,
        "type": type,
        "libelle": libelle,
        "date_realisation": date_realisation_dt,
        "laboratoire_nom": laboratoire_nom,
        "prestataire_id": prestataire_id,
        "uploade_par_email": current_user.email,
        "uploade_par_role": current_user.role,
        "commentaire": commentaire,
        "fichiers": fichiers_sauvegardes,
        "statut": "disponible",
        "created_at": datetime.utcnow(),
    }
    result = await documents_medicaux_collection.insert_one(nouveau_document)

    if demande:
        await demandes_examen_collection.update_one(
            {"_id": demande["_id"]},
            # Un résultat déposé résout tout problème signalé précédemment
            # (ex: échantillon rejeté puis un nouveau prélèvement accepté).
            {"$set": {"statut": "traitee", "probleme_signale": False, "motif_probleme": None}}
        )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="UPLOAD_DOCUMENT_MEDICAL",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    cree = await documents_medicaux_collection.find_one({"_id": result.inserted_id})
    return _formater(cree)


@router.patch("/{document_id}", response_model=DocumentMedicalOut)
async def modifier_document(
    document_id: str,
    type: str | None = Form(None),
    libelle: str | None = Form(None),
    date_realisation: str | None = Form(None),
    commentaire: str | None = Form(None),
    fichiers: list[UploadFile] | None = File(None),
    current_user: User = Depends(require_role("medecin", "laboratoire"))
):
    """
    Corrige un document déjà déposé (erreur de saisie ou mauvais fichier) —
    réservé à son auteur d'origine. Si de nouveaux fichiers sont fournis, ils
    remplacent intégralement les précédents (anciens fichiers supprimés du disque).
    """
    try:
        object_id = ObjectId(document_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant de document invalide.")

    document = await documents_medicaux_collection.find_one({"_id": object_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document introuvable.")

    if document.get("uploade_par_email") != current_user.email:
        raise HTTPException(status_code=403, detail="Vous ne pouvez modifier que vos propres dépôts.")

    updates: dict = {}

    if type is not None:
        if type not in TYPES_DOCUMENT_VALIDES:
            raise HTTPException(
                status_code=400,
                detail=f"Type de document invalide. Valeurs autorisées : {', '.join(TYPES_DOCUMENT_VALIDES)}."
            )
        updates["type"] = type
    if libelle is not None:
        updates["libelle"] = libelle
    if date_realisation is not None:
        try:
            updates["date_realisation"] = datetime.fromisoformat(date_realisation)
        except ValueError:
            raise HTTPException(status_code=400, detail="Date de réalisation invalide (format attendu : AAAA-MM-JJ).")
    if commentaire is not None:
        updates["commentaire"] = commentaire

    if fichiers:
        if len(fichiers) > 5:
            raise HTTPException(status_code=400, detail="5 fichiers maximum par dépôt.")
        nouveaux_fichiers = [await sauvegarder_fichier(f) for f in fichiers]
        for ancien in document.get("fichiers", []):
            supprimer_fichier(ancien["chemin_stockage"])
            if ancien.get("vignette_chemin"):
                supprimer_fichier(ancien["vignette_chemin"])
        updates["fichiers"] = nouveaux_fichiers

    if not updates:
        raise HTTPException(status_code=400, detail="Aucune modification fournie.")

    updates["updated_at"] = datetime.utcnow()

    await documents_medicaux_collection.update_one({"_id": object_id}, {"$set": updates})

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="MODIFICATION_DOCUMENT_MEDICAL",
        statut_action="SUCCES",
        npi_concerne=document["npi"]
    )

    modifie = await documents_medicaux_collection.find_one({"_id": object_id})
    return _formater(modifie)


@router.patch("/{document_id}/interpretation", response_model=DocumentMedicalOut)
async def definir_interpretation(
    document_id: str,
    payload: InterpretationUpdate,
    current_user: User = Depends(require_role("medecin"))
):
    """
    Laisse une interprétation clinique écrite sur un résultat — garde une
    trace du résultat expliqué au patient, plutôt que seulement à l'oral.
    N'importe quel médecin peut la poser ou la corriger (dossier partagé,
    même logique d'accès large que le reste du contexte clinique).
    """
    try:
        object_id = ObjectId(document_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant de document invalide.")

    document = await documents_medicaux_collection.find_one({"_id": object_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document introuvable.")

    await documents_medicaux_collection.update_one(
        {"_id": object_id},
        {"$set": {
            "interpretation_medecin": payload.interpretation_medecin,
            "interpretation_par_email": current_user.email,
            "updated_at": datetime.utcnow(),
        }}
    )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="INTERPRETATION_DOCUMENT_MEDICAL",
        statut_action="SUCCES",
        npi_concerne=document["npi"]
    )

    modifie = await documents_medicaux_collection.find_one({"_id": object_id})
    return _formater(modifie)


@router.get("/patient/{npi}", response_model=list[DocumentMedicalOut])
async def lister_documents_patient(
    npi: str,
    current_user: User = Depends(get_current_user)
):
    """Médecin/infirmier : accès libre (contexte clinique). Patient : uniquement son propre NPI."""
    await verifier_acces_dossier_patient(current_user, npi)

    cursor = documents_medicaux_collection.find({"npi": npi, "statut": "disponible"}).sort("created_at", -1)
    documents = await cursor.to_list(length=200)
    return [_formater(d) for d in documents]


@router.get("/{document_id}/fichier/{fichier_id}")
async def telecharger_fichier(
    document_id: str,
    fichier_id: str,
    vignette: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    Sert le fichier réel (ou sa vignette). L'URL contient un ObjectId, jamais
    le nom original ni le chemin disque, et l'accès subit le même contrôle
    que la lecture du document lui-même.
    """
    try:
        object_id = ObjectId(document_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant de document invalide.")

    document = await documents_medicaux_collection.find_one({"_id": object_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document introuvable.")

    await verifier_acces_dossier_patient(current_user, document["npi"])

    fichier = next((f for f in document.get("fichiers", []) if f["chemin_stockage"] == fichier_id), None)
    if not fichier:
        raise HTTPException(status_code=404, detail="Fichier introuvable.")

    if vignette:
        if not fichier.get("vignette_chemin"):
            raise HTTPException(status_code=404, detail="Aucune vignette disponible pour ce fichier.")
        return FileResponse(chemin_absolu(fichier["vignette_chemin"]), media_type="image/jpeg")

    return FileResponse(
        chemin_absolu(fichier["chemin_stockage"]),
        media_type=fichier["type_mime"],
        filename=fichier["nom_original"],
    )


@router.delete("/{document_id}")
async def archiver_document(
    document_id: str,
    current_user: User = Depends(require_role("medecin", "super_admin"))
):
    """Archive un document (ne le supprime pas physiquement du disque immédiatement)."""
    try:
        object_id = ObjectId(document_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant de document invalide.")

    document = await documents_medicaux_collection.find_one({"_id": object_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document introuvable.")

    await documents_medicaux_collection.update_one(
        {"_id": object_id},
        {"$set": {"statut": "archive"}}
    )

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="ARCHIVAGE_DOCUMENT_MEDICAL",
        statut_action="SUCCES",
        npi_concerne=document["npi"]
    )

    return {"message": "Document archivé avec succès."}

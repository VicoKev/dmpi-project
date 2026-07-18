from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from app.database_mongo import (
    dossiers_medicaux_collection,
    consultations_collection,
    constantes_vitales_collection,
)
from app.security import get_current_user, require_role
from app.models_sql import User
from app.audit import enregistrer_log
from datetime import datetime, date

router = APIRouter(
    prefix="/patients",
    tags=["Espace Patient (lecture seule)"]
)


def _npi_du_patient_connecte(current_user: User) -> str:
    """
    Un compte patient est toujours rattaché à un NPI unique (npi_patient sur User).
    Empêche un patient de consulter le dossier de quelqu'un d'autre.
    """
    if not current_user.npi_patient:
        raise HTTPException(
            status_code=400,
            detail="Ce compte patient n'est rattaché à aucun NPI."
        )
    return current_user.npi_patient


def _serialiser_mongo(document: dict) -> dict:
    """Convertit les champs non-JSON-natifs (ObjectId, datetime) d'un document Mongo."""
    doc = dict(document)
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    for cle, valeur in doc.items():
        if isinstance(valeur, (datetime, date)):
            doc[cle] = valeur.isoformat()
    return doc


@router.get("/me")
async def consulter_mon_dossier(
    current_user: User = Depends(require_role("patient"))
):
    """
    Portail personnel en lecture seule : dossier médical, historique
    des consultations et ordonnances associées, constantes vitales.
    Réservé aux comptes patients, restreint à leur propre NPI.
    """
    npi = _npi_du_patient_connecte(current_user)

    dossier = await dossiers_medicaux_collection.find_one({"npi": npi})
    if not dossier:
        raise HTTPException(
            status_code=404,
            detail="Aucun dossier médical n'est encore associé à ce compte."
        )

    consultations_cursor = consultations_collection.find({"npi": npi}).sort("created_at", -1)
    consultations = await consultations_cursor.to_list(length=200)

    constantes_cursor = constantes_vitales_collection.find({"npi": npi}).sort("created_at", -1)
    constantes = await constantes_cursor.to_list(length=50)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="PATIENT_CONSULTATION_PROPRE_DOSSIER",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    return {
        "dossier": _serialiser_mongo(dossier),
        "consultations": [_serialiser_mongo(c) for c in consultations],
        "constantes_vitales": [_serialiser_mongo(c) for c in constantes],
    }


@router.get("/me/export")
async def exporter_mon_dossier(
    format: str = "fhir",
    current_user: User = Depends(require_role("patient"))
):
    """
    Export du dossier médical personnel.
    - format=fhir (défaut) : structure inspirée du standard HL7 FHIR (Bundle de ressources).
    - format=json : export brut simplifié.
    """
    npi = _npi_du_patient_connecte(current_user)

    dossier = await dossiers_medicaux_collection.find_one({"npi": npi})
    if not dossier:
        raise HTTPException(
            status_code=404,
            detail="Aucun dossier médical n'est encore associé à ce compte."
        )

    consultations_cursor = consultations_collection.find({"npi": npi}).sort("created_at", -1)
    consultations = await consultations_cursor.to_list(length=200)

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="PATIENT_EXPORT_DOSSIER",
        statut_action="SUCCES",
        npi_concerne=npi
    )

    dossier = _serialiser_mongo(dossier)
    consultations = [_serialiser_mongo(c) for c in consultations]

    if format == "fhir":
        entries = [{
            "resourceType": "Patient",
            "identifier": [{"system": "urn:dmpi:npi", "value": npi}],
            "extension": [{
                "url": "urn:dmpi:groupe-sanguin",
                "valueString": dossier.get("groupe_sanguin"),
            }],
        }]

        for allergie in dossier.get("allergies", []):
            entries.append({
                "resourceType": "AllergyIntolerance",
                "patient": {"identifier": {"value": npi}},
                "code": {"text": allergie.get("substance")},
                "criticality": allergie.get("severite"),
                "note": allergie.get("notes"),
            })

        for traitement in dossier.get("traitements_en_cours", []):
            entries.append({
                "resourceType": "MedicationStatement",
                "patient": {"identifier": {"value": npi}},
                "status": "active" if traitement.get("actif", True) else "stopped",
                "medicationCodeableConcept": {"text": traitement.get("nom_medicament")},
                "dosage": [{"text": traitement.get("posologie")}],
                "reasonCode": [{"text": traitement.get("indication")}] if traitement.get("indication") else [],
            })

        for consultation in consultations:
            entries.append({
                "resourceType": "Encounter",
                "id": consultation.get("_id"),
                "subject": {"identifier": {"value": npi}},
                "reasonCode": [{"text": consultation.get("motif")}],
                "diagnosis": [{"condition": {"text": consultation.get("diagnostic_cim10")}}],
                "period": {"start": consultation.get("created_at")},
            })
            ordonnance = consultation.get("ordonnance")
            if ordonnance:
                for medicament in ordonnance.get("traitements", []):
                    entries.append({
                        "resourceType": "MedicationRequest",
                        "encounter": {"id": consultation.get("_id")},
                        "subject": {"identifier": {"value": npi}},
                        "medicationCodeableConcept": {"text": medicament.get("nom_medicament")},
                        "dosageInstruction": [{"text": medicament.get("posologie")}],
                        "note": [{"text": f"Durée : {medicament.get('duree')}"}],
                    })

        bundle = {
            "resourceType": "Bundle",
            "type": "collection",
            "timestamp": datetime.utcnow().isoformat(),
            "entry": [{"resource": e} for e in entries],
        }
        return JSONResponse(content=bundle)

    return JSONResponse(content={
        "npi": npi,
        "dossier": dossier,
        "consultations": consultations,
    })
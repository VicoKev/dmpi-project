from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database_sql import get_sql_db
from app.database_mongo import (
    ordonnances_collection,
    dossiers_medicaux_collection,
    etablissements_collection,
    prestataires_partenaires_collection,
)
from app.schemas.ordonnance import OrdonnanceMongo, OrdonnanceOut
from app.schemas.prestataire import PharmaciesProchesResponse, ReferenceLocalisation, PharmacieProche
from app.security import get_current_user
from app.models_sql import User
from app.audit import enregistrer_log
from app.kafka_producer import publier_evenement
from app.geo_utils import distance_km
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId

router = APIRouter(
    prefix="/ordonnances",
    tags=["Ordonnances (MongoDB)"]
)


def _formater(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


async def _resoudre_etablissement_prescripteur(db_sql: AsyncSession, auteur_email: str | None) -> tuple[str | None, dict | None]:
    """
    Depuis l'email du prescripteur, retrouve son établissement de rattachement
    (nom + document Mongo complet, pour la localisation). Renvoie (None, None)
    si l'auteur est inconnu ou n'a pas d'établissement rattaché.
    """
    if not auteur_email:
        return None, None

    result = await db_sql.execute(select(User).where(User.email == auteur_email))
    auteur = result.scalar_one_or_none()
    if not auteur or not auteur.etablissement_id or not ObjectId.is_valid(auteur.etablissement_id):
        return None, None

    etab = await etablissements_collection.find_one({"_id": ObjectId(auteur.etablissement_id)})
    if not etab:
        return None, None

    return etab.get("nom"), etab


async def _enrichir_ordonnances(db_sql: AsyncSession, ordonnances: list[dict]) -> list[dict]:
    """Ajoute etablissement_nom à une liste d'ordonnances, en mutualisant la
    résolution par auteur pour éviter une requête Postgres par ligne."""
    cache: dict[str, str | None] = {}
    for o in ordonnances:
        auteur = o.get("auteur")
        if auteur not in cache:
            nom, _ = await _resoudre_etablissement_prescripteur(db_sql, auteur)
            cache[auteur] = nom
        o["etablissement_nom"] = cache[auteur]
    return ordonnances


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


@router.get("/patient/{npi}", response_model=list[OrdonnanceOut])
async def lister_ordonnances_patient(
    npi: str,
    db_sql: AsyncSession = Depends(get_sql_db),
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

    ordonnances = await _enrichir_ordonnances(db_sql, ordonnances)
    return [_formater(o) for o in ordonnances]

@router.get("/medecin/{email}", response_model=list[OrdonnanceOut])
async def lister_ordonnances_medecin(
    email: str,
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupère toutes les ordonnances créées par un médecin.
    """
    cursor = ordonnances_collection.find({"auteur": email}).sort("created_at", -1)
    ordonnances = await cursor.to_list(length=200)
    ordonnances = await _enrichir_ordonnances(db_sql, ordonnances)
    return [_formater(o) for o in ordonnances]


@router.get("/{ordonnance_id}/pharmacies-proches", response_model=PharmaciesProchesResponse)
async def pharmacies_proches(
    ordonnance_id: str,
    latitude: float | None = None,
    longitude: float | None = None,
    limite: int = 5,
    db_sql: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """
    Suggère les pharmacies partenaires les plus proches pour une ordonnance
    donnée. Position de référence : celle fournie en paramètre (position du
    patient), sinon celle de l'établissement prescripteur.

    Ne garantit aucune disponibilité de médicament — seulement qu'il s'agit
    d'une pharmacie partenaire active à proximité.
    """
    try:
        object_id = ObjectId(ordonnance_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Identifiant d'ordonnance invalide.")

    ordonnance = await ordonnances_collection.find_one({"_id": object_id})
    if not ordonnance:
        raise HTTPException(status_code=404, detail="Ordonnance introuvable.")

    # Contrôle d'accès : le patient concerné, le prescripteur, ou un rôle
    # d'administration (déjà couvert par require_role ailleurs — ici on
    # accepte tout utilisateur authentifié dont l'identité correspond).
    est_le_patient = current_user.npi_patient == ordonnance.get("npi")
    est_le_prescripteur = current_user.email == ordonnance.get("auteur")
    est_administration = current_user.role in ("super_admin", "admin_etablissement")
    if not (est_le_patient or est_le_prescripteur or est_administration):
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette ordonnance.")

    reference: ReferenceLocalisation | None = None
    if latitude is not None and longitude is not None:
        reference = ReferenceLocalisation(latitude=latitude, longitude=longitude, source="position_utilisateur")
    else:
        _, etab = await _resoudre_etablissement_prescripteur(db_sql, ordonnance.get("auteur"))
        if etab and etab.get("latitude") is not None and etab.get("longitude") is not None:
            reference = ReferenceLocalisation(
                latitude=etab["latitude"], longitude=etab["longitude"], source="etablissement_prescripteur"
            )

    if reference is None:
        return PharmaciesProchesResponse(reference=None, pharmacies=[])

    cursor = prestataires_partenaires_collection.find({
        "types": "pharmacie",
        "statut": "actif",
        "latitude": {"$ne": None},
        "longitude": {"$ne": None},
    })
    pharmacies_brutes = await cursor.to_list(length=None)

    candidats = [
        PharmacieProche(
            id=str(p["_id"]),
            nom=p["nom"],
            adresse=p.get("adresse"),
            commune=p.get("commune"),
            latitude=p["latitude"],
            longitude=p["longitude"],
            telephone=p["telephone"],
            horaires=p.get("horaires"),
            distance_km=round(distance_km(reference.latitude, reference.longitude, p["latitude"], p["longitude"]), 1),
            derniere_verification=p.get("derniere_verification"),
        )
        for p in pharmacies_brutes
    ]
    candidats.sort(key=lambda c: c.distance_km)

    return PharmaciesProchesResponse(reference=reference, pharmacies=candidats[:limite])

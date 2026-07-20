from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017/dmpi_db")

try:
    parsed_url = urlparse(MONGO_URL)
    DATABASE_NAME = parsed_url.path.lstrip('/') or "dmpi_db"
except Exception:
    DATABASE_NAME = "dmpi_db"

client = AsyncIOMotorClient(MONGO_URL)
database = client[DATABASE_NAME]

consultations_collection = database["consultations"]
ordonnances_collection = database["ordonnances"]
dossiers_medicaux_collection = database["dossiers_medicaux"]
constantes_vitales_collection = database["constantes_vitales"]
administrations_collection = database["administrations_traitements"]
rendez_vous_collection = database["rendez_vous"]
etablissements_collection = database["etablissements"]
file_attente_collection = database["file_attente"]
prestataires_partenaires_collection = database["prestataires_partenaires"]
demandes_examen_collection = database["demandes_examen"]
documents_medicaux_collection = database["documents_medicaux"]

async def get_mongo_db():
    """Dependency pour injecter la base MongoDB dans les routes."""
    yield database


# Collections où chaque document représente un fait clinique rattaché à un
# patient identifié par son NPI (10 chiffres) — le champ sur lequel portent
# presque toutes les lectures de l'application.
_COLLECTIONS_PAR_NPI = [
    dossiers_medicaux_collection,
    consultations_collection,
    ordonnances_collection,
    constantes_vitales_collection,
    administrations_collection,
    demandes_examen_collection,
    file_attente_collection,
    documents_medicaux_collection,
]


async def creer_index_mongo() -> None:
    """
    Index MongoDB — sans eux, chaque recherche par NPI (dossiers,
    consultations, ordonnances, constantes, examens, file d'attente,
    documents) parcourt l'intégralité de la collection au lieu d'aller
    directement à la bonne entrée. Invisible avec peu de données, ça devient
    un vrai ralentissement à mesure que la base grossit.

    create_index est idempotent (aucun effet si l'index existe déjà) — sûr à
    rappeler à chaque démarrage plutôt que de gérer ça via une migration à part.
    """
    await dossiers_medicaux_collection.create_index("npi", unique=True)
    await dossiers_medicaux_collection.create_index([("nom", 1), ("prenom", 1)])

    for collection in (
        consultations_collection,
        ordonnances_collection,
        constantes_vitales_collection,
        administrations_collection,
        demandes_examen_collection,
        documents_medicaux_collection,
    ):
        await collection.create_index("npi")

    await consultations_collection.create_index("releve_par")
    await ordonnances_collection.create_index("auteur")
    await demandes_examen_collection.create_index("prestataire_id")
    await demandes_examen_collection.create_index("medecin_email")
    await documents_medicaux_collection.create_index([("npi", 1), ("statut", 1)])

    await rendez_vous_collection.create_index("npi_patient")
    await rendez_vous_collection.create_index("medecin_email")

    await file_attente_collection.create_index([("etablissement_id", 1), ("statut", 1)])
    await file_attente_collection.create_index([("medecin_email", 1), ("statut", 1)])
    await file_attente_collection.create_index("npi")


async def configurer_validation_mongo() -> None:
    """
    Garde-fou au niveau de la base : sans lui, toute la vérification des
    données clinique repose uniquement sur le code de l'API — un bug ou une
    écriture directe en base pourrait insérer un document sans NPI valide
    sans qu'aucun garde-fou ne s'y oppose. On se limite volontairement au
    NPI (l'invariant le plus fondamental, partagé par toutes ces
    collections) plutôt que de figer toute la forme des documents cliniques,
    qui reste amenée à évoluer.

    validationLevel="moderate" n'affecte que les nouvelles écritures : les
    documents déjà en base, même invalides, ne sont jamais rejetés rétroactivement.
    """
    schema_npi = {
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["npi"],
            "properties": {
                "npi": {
                    "bsonType": "string",
                    "pattern": "^[0-9]{10}$",
                    "description": "NPI : exactement 10 chiffres.",
                }
            },
        }
    }
    noms_existants = await database.list_collection_names()
    for collection in _COLLECTIONS_PAR_NPI:
        nom = collection.name
        if nom not in noms_existants:
            await database.create_collection(nom)
        await database.command({
            "collMod": nom,
            "validator": schema_npi,
            "validationLevel": "moderate",
            "validationAction": "error",
        })


async def initialiser_mongo() -> None:
    """Point d'entrée unique appelé au démarrage de l'application."""
    await creer_index_mongo()
    await configurer_validation_mongo()
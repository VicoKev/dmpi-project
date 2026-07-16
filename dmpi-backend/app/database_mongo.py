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

async def get_mongo_db():
    """Dependency pour injecter la base MongoDB dans les routes."""
    yield database
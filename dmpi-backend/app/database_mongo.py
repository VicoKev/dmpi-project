from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DATABASE_NAME = "dmpi"

client = AsyncIOMotorClient(MONGO_URL)
database = client[DATABASE_NAME]

consultations_collection = database["consultations"]
ordonnances_collection = database["ordonnances"]
dossiers_medicaux_collection = database["dossiers_medicaux"]
constantes_vitales_collection = database["constantes_vitales"]
administrations_collection = database["administrations_traitements"]
rendez_vous_collection = database["rendez_vous"]
etablissements_collection = database["etablissements"]

async def get_mongo_db():
    """Dependency pour injecter la base MongoDB dans les routes."""
    yield database
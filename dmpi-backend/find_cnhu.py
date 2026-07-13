import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.database_mongo import etablissements_collection

async def get_cnhu_id():
    etab = await etablissements_collection.find_one({"nom": {"$regex": "CNHU", "$options": "i"}})
    if etab:
        print(f"CNHU TROUVÉ: {etab['_id']} - {etab['nom']}")
    else:
        print("CNHU NON TROUVÉ")

if __name__ == "__main__":
    asyncio.run(get_cnhu_id())

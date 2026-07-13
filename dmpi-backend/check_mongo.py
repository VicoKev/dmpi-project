import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['dmpi_db']
    
    print("--- DOSSIER ---")
    doc_dossier = await db.dossiers_medicaux.find_one()
    print(doc_dossier)
    
    print("--- CONSULTATION ---")
    doc_consult = await db.consultations.find_one()
    print(doc_consult)

if __name__ == "__main__":
    asyncio.run(main())

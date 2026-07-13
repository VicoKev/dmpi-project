import asyncio
from app.database_mongo import dossiers_medicaux_collection
async def main():
    dossier = await dossiers_medicaux_collection.find_one({'npi': '0987654321'})
    print('Dossier:', dossier)
asyncio.run(main())

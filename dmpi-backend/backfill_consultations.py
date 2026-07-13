import asyncio
from sqlalchemy.future import select
from motor.motor_asyncio import AsyncIOMotorClient
from app.database_mongo import consultations_collection
from app.database_sql import AsyncSessionLocal
from app.models_sql import User

async def run_backfill():
    print("Démarrage du backfill des consultations...")
    
    # Récupérer les consultations sans etablissement_id
    cursor = consultations_collection.find({"etablissement_id": {"$exists": False}})
    consultations = await cursor.to_list(length=None)
    
    total = len(consultations)
    print(f"Nombre de consultations à traiter : {total}")
    
    migrees = 0
    non_trouvees = 0
    
    # Ouvrir une session SQLAlchemy
    async with AsyncSessionLocal() as db:
        for c in consultations:
            email_medecin = c.get("releve_par")
            
            if not email_medecin:
                # Impossible de déduire
                await consultations_collection.update_one(
                    {"_id": c["_id"]},
                    {"$set": {"etablissement_id": None}}
                )
                non_trouvees += 1
                continue
                
            # Chercher le médecin dans SQL
            result = await db.execute(select(User).where(User.email == email_medecin))
            medecin = result.scalar_one_or_none()
            
            if medecin and medecin.etablissement_id:
                await consultations_collection.update_one(
                    {"_id": c["_id"]},
                    {"$set": {"etablissement_id": medecin.etablissement_id}}
                )
                migrees += 1
            else:
                await consultations_collection.update_one(
                    {"_id": c["_id"]},
                    {"$set": {"etablissement_id": None}}
                )
                non_trouvees += 1

    print("--- RÉSULTATS DU BACKFILL ---")
    print(f"Total des consultations traitées : {total}")
    print(f"Consultations migrées avec succès (etablissement trouvé) : {migrees}")
    print(f"Consultations laissées à null (médecin introuvable ou sans etablissement) : {non_trouvees}")

if __name__ == "__main__":
    asyncio.run(run_backfill())

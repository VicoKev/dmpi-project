import asyncio
from sqlalchemy.future import select
from motor.motor_asyncio import AsyncIOMotorClient
from app.database_mongo import consultations_collection
from app.database_sql import AsyncSessionLocal
from app.models_sql import User

async def run_diagnostic():
    print("--- DIAGNOSTIC DES 3 CONSULTATIONS ORPHELINES ---")
    cursor = consultations_collection.find()
    consultations = await cursor.to_list(length=None)
    
    async with AsyncSessionLocal() as db:
        for i, c in enumerate(consultations, 1):
            email = c.get("releve_par")
            print(f"Consultation {i}: releve_par = {email}, _id = {c['_id']}")
            if email:
                result = await db.execute(select(User).where(User.email == email))
                user = result.scalar_one_or_none()
                if user:
                    print(f"  -> Utilisateur trouvé dans Postgres: id={user.id}, role={user.role}, etablissement_id={user.etablissement_id}, est_actif={user.est_actif}")
                else:
                    print(f"  -> Utilisateur introuvable dans Postgres !")
            else:
                print("  -> Aucun email (releve_par) associé.")
                
        print("\n--- DIAGNOSTIC DES MÉDECINS ET INFIRMIERS ---")
        result = await db.execute(select(User).where(User.role.in_(["medecin", "infirmier"])))
        users = result.scalars().all()
        
        print(f"Total comptes médecin/infirmier trouvés : {len(users)}")
        for u in users:
            print(f" - {u.email} (Role: {u.role}, Actif: {u.est_actif}) -> etablissement_id: {u.etablissement_id}")

if __name__ == "__main__":
    asyncio.run(run_diagnostic())

import asyncio
from sqlalchemy import text
from app.database_sql import AsyncSessionLocal

async def run_migration():
    print("Début de la migration SQL...")
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("ALTER TABLE users ADD COLUMN specialite VARCHAR;"))
            print("OK: Ajout de specialite")
        except Exception as e:
            print("ERR: specialite ->", e)
            
        try:
            await db.execute(text("ALTER TABLE users ADD COLUMN service VARCHAR;"))
            print("OK: Ajout de service")
        except Exception as e:
            print("ERR: service ->", e)
            
        try:
            await db.execute(text("ALTER TABLE users ADD COLUMN derniere_connexion TIMESTAMP;"))
            print("OK: Ajout de derniere_connexion")
        except Exception as e:
            print("ERR: derniere_connexion ->", e)
            
        try:
            await db.execute(text("ALTER TABLE users ADD COLUMN derniere_connexion_ip VARCHAR;"))
            print("OK: Ajout de derniere_connexion_ip")
        except Exception as e:
            print("ERR: derniere_connexion_ip ->", e)
            
        try:
            await db.execute(text("ALTER TABLE audit_logs ADD COLUMN adresse_ip VARCHAR;"))
            print("OK: Ajout de adresse_ip à audit_logs")
        except Exception as e:
            print("ERR: adresse_ip ->", e)
            
        await db.commit()
    print("Migration SQL terminée.")

if __name__ == "__main__":
    asyncio.run(run_migration())

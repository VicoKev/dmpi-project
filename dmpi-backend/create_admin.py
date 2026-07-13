import asyncio
import os
from app.database_sql import AsyncSessionLocal
from app.models_sql import User
from app.security import hash_password

async def create_first_admin():
    mot_de_passe = os.getenv("ADMIN_INITIAL_PASSWORD")
    if not mot_de_passe:
        print("Erreur : définis la variable d'environnement ADMIN_INITIAL_PASSWORD avant de lancer ce script.")
        return

    async with AsyncSessionLocal() as db:
        admin = User(
            email="admin@dmpi.bj",
            mot_de_passe_hash=hash_password(mot_de_passe),
            nom="National",
            prenom="Super Admin",
            role="super_admin",
            est_actif=True
        )
        db.add(admin)
        await db.commit()
        print("Compte Super Admin créé avec succès !")
        print("Email : admin@dmpi.bj")

asyncio.run(create_first_admin())
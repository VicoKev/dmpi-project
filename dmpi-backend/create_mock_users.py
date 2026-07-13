import asyncio
from app.database_sql import AsyncSessionLocal
from app.models_sql import User
from app.security import hash_password

async def create_mock_users():
    users = [
        {
            "email": "dr.kouassi@cnhu-cotonou.bj",
            "mot_de_passe_hash": hash_password("password123"),
            "nom": "Kouassi",
            "prenom": "Jean",
            "role": "medecin",
            "est_actif": True
        },
        {
            "email": "inf.mensah@cnhu-cotonou.bj",
            "mot_de_passe_hash": hash_password("password123"),
            "nom": "Mensah",
            "prenom": "Aline",
            "role": "infirmier",
            "est_actif": True
        },
        {
            "email": "patient@dmpi.bj",
            "mot_de_passe_hash": hash_password("password123"),
            "nom": "Doe",
            "prenom": "John",
            "role": "patient",
            "est_actif": True
        },
        {
            "email": "admin@hopital-parakou.bj",
            "mot_de_passe_hash": hash_password("password123"),
            "nom": "Admin",
            "prenom": "Parakou",
            "role": "admin",
            "est_actif": True
        },
        {
            "email": "superadmin@dmpi-benin.gov.bj",
            "mot_de_passe_hash": hash_password("admin2025"),
            "nom": "National",
            "prenom": "Super Admin",
            "role": "super_admin",
            "est_actif": True
        }
    ]

    async with AsyncSessionLocal() as db:
        for u in users:
            # Check if user already exists
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if not existing:
                db.add(User(**u))
        await db.commit()
        print("Mock users created successfully!")

if __name__ == "__main__":
    asyncio.run(create_mock_users())

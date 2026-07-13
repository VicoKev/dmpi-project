import asyncio
from sqlalchemy.future import select
from sqlalchemy import text
from app.database_sql import AsyncSessionLocal
from app.models_sql import User

async def run_updates_and_check():
    print("--- EXECUTION DES MISES À JOUR ---")
    
    async with AsyncSessionLocal() as db:
        # Exécution des updates
        await db.execute(text("UPDATE users SET etablissement_id = '6a51450045b0d267bd215391' WHERE email = 'dr.kouassi@cnhu-cotonou.bj'"))
        await db.execute(text("UPDATE users SET etablissement_id = '6a51450045b0d267bd215391' WHERE email = 'inf.mensah@cnhu-cotonou.bj'"))
        await db.commit()
        print("Mises à jour terminées et commitées.\n")
        
        print("--- RECONTRÔLE FINAL ---")
        # Vérifier tous les rôles nécessitant un établissement
        roles_cibles = ["medecin", "infirmier", "admin_etablissement"]
        
        # 1. Nombre total de comptes actifs avec ces rôles
        query_total = select(User).where(User.role.in_(roles_cibles), User.est_actif == True)
        result_total = await db.execute(query_total)
        total_actifs = len(result_total.scalars().all())
        
        # 2. Nombre de comptes avec etablissement_id NULL
        query_null = select(User).where(
            User.role.in_(roles_cibles), 
            User.est_actif == True,
            User.etablissement_id == None
        )
        result_null = await db.execute(query_null)
        null_users = result_null.scalars().all()
        
        print(f"Nombre total de comptes vérifiés (medecin, infirmier, admin_etablissement actifs) : {total_actifs}")
        print(f"Nombre de comptes ayant un etablissement_id à NULL : {len(null_users)}")
        
        if len(null_users) > 0:
            print("\nDétail des anomalies :")
            for u in null_users:
                print(f" - {u.email} (Role: {u.role})")
        else:
            print("\nSUCCÈS : Tous les comptes professionnels actifs sont bien rattachés à un établissement.")

if __name__ == "__main__":
    asyncio.run(run_updates_and_check())

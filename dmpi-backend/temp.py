import asyncio
from app.database_sql import AsyncSessionLocal
from sqlalchemy import select
from app.models_sql import User
async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.nom == 'Oga'))
        users = result.scalars().all()
        for u in users: print(u.email, u.npi_patient, u.date_creation)
asyncio.run(main())

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database_sql import get_sql_db
from app.models_sql import Departement, Commune, Arrondissement, Quartier, User
from app.schemas.territoire import DepartementOut, CommuneOut, ArrondissementOut, QuartierOut
from app.security import get_current_user

router = APIRouter(
    prefix="/territoire",
    tags=["Découpage territorial"]
)


@router.get("/departements", response_model=list[DepartementOut])
async def lister_departements(
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Departement).order_by(Departement.lib_dep))
    return result.scalars().all()


@router.get("/communes", response_model=list[CommuneOut])
async def lister_communes(
    departement_id: int,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Commune).where(Commune.id_dep == departement_id).order_by(Commune.lib_com)
    )
    return result.scalars().all()


@router.get("/arrondissements", response_model=list[ArrondissementOut])
async def lister_arrondissements(
    commune_id: int,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Arrondissement).where(Arrondissement.id_com == commune_id).order_by(Arrondissement.lib_arrond)
    )
    return result.scalars().all()


@router.get("/quartiers", response_model=list[QuartierOut])
async def lister_quartiers(
    arrondissement_id: int,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Quartier).where(Quartier.id_arrond == arrondissement_id).order_by(Quartier.lib_quart)
    )
    return result.scalars().all()

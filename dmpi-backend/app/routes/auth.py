from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database_sql import get_sql_db
from app.models_sql import User
from app.schemas.user import UserLogin, TokenResponse
from app.security import verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Authentification"]
)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_sql_db)):
    """
    Connexion par email/mot de passe (MVP : comptes préconfigurés, pas d'inscription).
    """
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.mot_de_passe, user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect."
        )

    if not user.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a été désactivé."
        )

    from datetime import datetime
    from app.context import client_ip
    user.derniere_connexion = datetime.utcnow()
    user.derniere_connexion_ip = client_ip.get()
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.email, "role": user.role})

    return TokenResponse(access_token=token, utilisateur=user)
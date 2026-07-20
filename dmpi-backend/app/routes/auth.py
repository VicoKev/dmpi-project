from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database_sql import get_sql_db
from app.models_sql import User
from app.schemas.user import UserLogin, TokenResponse, ChangerMotDePasseRequest
from app.security import verify_password, hash_password, create_access_token, get_current_user
from app.audit import enregistrer_log

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


@router.patch("/mon-mot-de-passe")
async def changer_mon_mot_de_passe(
    payload: ChangerMotDePasseRequest,
    db: AsyncSession = Depends(get_sql_db),
    current_user: User = Depends(get_current_user)
):
    """Auto-service : tout utilisateur connecté peut changer son propre mot de passe."""
    if not verify_password(payload.ancien_mot_de_passe, current_user.mot_de_passe_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect.")

    if payload.nouveau_mot_de_passe == payload.ancien_mot_de_passe:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'actuel.")

    current_user.mot_de_passe_hash = hash_password(payload.nouveau_mot_de_passe)
    await db.commit()

    await enregistrer_log(
        utilisateur_email=current_user.email,
        action="CHANGEMENT_MOT_DE_PASSE",
        statut_action="SUCCES",
        npi_concerne=None
    )

    return {"message": "Mot de passe modifié avec succès."}
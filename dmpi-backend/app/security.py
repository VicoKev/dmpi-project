import os
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database_sql import get_sql_db
from app.models_sql import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY doit être définie dans le fichier .env avant de démarrer l'application."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

bearer_scheme = HTTPBearer(
    scheme_name="Bearer",
    description="Collez ici le token JWT obtenu via POST /auth/login (sans le préfixe 'Bearer', Swagger l'ajoute automatiquement)."
)


def hash_password(password: str) -> str:
    """Transforme un mot de passe en clair en hash sécurisé."""
    return pwd_context.hash(password)


def verify_password(password_clair: str, password_hash: str) -> bool:
    """Vérifie qu'un mot de passe en clair correspond au hash stocké."""
    return pwd_context.verify(password_clair, password_hash)


def create_access_token(data: dict) -> str:
    """Génère un token JWT signé, valable ACCESS_TOKEN_EXPIRE_MINUTES."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_sql_db)
) -> User:
    """
    Dépendance FastAPI : décode le token JWT et retourne l'utilisateur correspondant.
    À utiliser sur toute route qui doit être protégée.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not user.est_actif:
        raise credentials_exception

    return user


def require_role(*roles_autorises: str):
    """
    Génère une dépendance qui vérifie que l'utilisateur a l'un des rôles autorisés.
    Usage : Depends(require_role("medecin", "super_admin"))
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles_autorises:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès réservé aux rôles : {', '.join(roles_autorises)}."
            )
        return current_user
    return role_checker
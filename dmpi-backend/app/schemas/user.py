from pydantic import BaseModel, EmailStr
from datetime import datetime, date

class UserLogin(BaseModel):
    email: EmailStr
    mot_de_passe: str

class UserCreate(BaseModel):
    """Schéma pour la création d'un compte par le Super Admin."""
    email: EmailStr
    mot_de_passe: str
    nom: str
    prenom: str
    role: str  # "medecin", "infirmier", "admin_etablissement", "super_admin", "patient"
    specialite: str | None = None
    service: str | None = None
    npi_patient: str | None = None  # renseigné uniquement si role == "patient"
    etablissement_id: str | None = None  # renseigné si role == "medecin" ou "infirmier"
    date_naissance: date | None = None
    sexe: str | None = None
    groupe_sanguin: str | None = None

class UserUpdate(BaseModel):
    """Schéma pour la modification d'un compte (champs optionnels)."""
    email: EmailStr | None = None
    nom: str | None = None
    prenom: str | None = None
    role: str | None = None
    specialite: str | None = None
    service: str | None = None
    npi_patient: str | None = None
    etablissement_id: str | None = None

class UserOut(BaseModel):
    id: int
    email: str
    nom: str
    prenom: str
    role: str
    specialite: str | None = None
    service: str | None = None
    npi_patient: str | None = None
    etablissement_id: str | None = None
    est_actif: bool
    date_creation: datetime
    derniere_connexion: datetime | None = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    utilisateur: UserOut
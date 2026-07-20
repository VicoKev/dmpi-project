from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime, date

DOMAINE_EMAIL_AUTORISE = "dmpi.bj"


def _valider_domaine_dmpi(email: str) -> str:
    if not email.lower().endswith(f"@{DOMAINE_EMAIL_AUTORISE}"):
        raise ValueError(f"L'adresse email doit appartenir au domaine @{DOMAINE_EMAIL_AUTORISE}.")
    return email


class UserLogin(BaseModel):
    email: EmailStr
    mot_de_passe: str

class UserCreate(BaseModel):
    """Schéma pour la création d'un compte par le Super Admin."""
    email: EmailStr
    mot_de_passe: str = Field(..., min_length=8)
    nom: str
    prenom: str
    role: str  # "medecin", "infirmier", "admin_etablissement", "super_admin", "patient", "laboratoire"
    specialite: str | None = None
    service: str | None = None
    npi_patient: str | None = None  # renseigné uniquement si role == "patient"
    etablissement_id: str | None = None  # renseigné si role == "medecin" ou "infirmier"
    prestataire_id: str | None = None  # renseigné si role == "laboratoire"
    date_naissance: date | None = None
    sexe: str | None = None
    groupe_sanguin: str | None = None

    @field_validator("email")
    @classmethod
    def email_domaine_dmpi(cls, v: str) -> str:
        return _valider_domaine_dmpi(v)

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
    prestataire_id: str | None = None

    @field_validator("email")
    @classmethod
    def email_domaine_dmpi(cls, v: str | None) -> str | None:
        return _valider_domaine_dmpi(v) if v is not None else v

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
    prestataire_id: str | None = None
    est_actif: bool
    date_creation: datetime
    derniere_connexion: datetime | None = None

    class Config:
        from_attributes = True

class ChangerMotDePasseRequest(BaseModel):
    """Auto-service : l'utilisateur connecté change son propre mot de passe."""
    ancien_mot_de_passe: str
    nouveau_mot_de_passe: str = Field(..., min_length=8)


class ReinitialiserMotDePasseRequest(BaseModel):
    """Le super_admin force un nouveau mot de passe (compte oublié) — pas
    besoin de connaître l'ancien, contrairement au changement auto-service."""
    nouveau_mot_de_passe: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    utilisateur: UserOut
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from app.validators import normaliser_telephone_benin


class DemandeAccesCreate(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    nom: str
    prenom: str
    telephone_contact: str

    @field_validator("telephone_contact")
    @classmethod
    def telephone_valide(cls, v: str) -> str:
        return normaliser_telephone_benin(v)


class RejeterDemandeRequest(BaseModel):
    motif: str | None = None


class DemandeAccesOut(BaseModel):
    id: int
    npi: str
    nom: str
    prenom: str
    telephone_contact: str
    demandeur_email: str
    etablissement_id: str | None = None
    statut: str
    motif_rejet: str | None = None
    date_creation: datetime

    @field_validator("telephone_contact")
    @classmethod
    def telephone_valide(cls, v: str) -> str:
        return normaliser_telephone_benin(v)

    class Config:
        from_attributes = True

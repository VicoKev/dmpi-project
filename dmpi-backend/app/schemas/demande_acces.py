from pydantic import BaseModel, Field
from datetime import datetime


class DemandeAccesCreate(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    nom: str
    prenom: str
    telephone_contact: str


class DemandeAccesOut(BaseModel):
    id: int
    npi: str
    nom: str
    prenom: str
    telephone_contact: str
    demandeur_email: str
    etablissement_id: str | None = None
    statut: str
    date_creation: datetime

    class Config:
        from_attributes = True

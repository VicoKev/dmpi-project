from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class DelegationCreate(BaseModel):
    """Créée par le médecin/infirmier délégant."""
    beneficiaire_email: EmailStr
    npi_patient: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    motif: str | None = None
    duree_heures: int = Field(24, gt=0, le=720, description="Durée de validité en heures (max 30 jours)")


class DelegationOut(BaseModel):
    id: int
    delegant_email: str
    beneficiaire_email: str
    npi_patient: str
    motif: str | None = None
    date_debut: datetime
    date_fin: datetime
    active: bool
    date_creation: datetime

    class Config:
        from_attributes = True
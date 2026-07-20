from pydantic import BaseModel, EmailStr
from datetime import datetime


class DemandeReinitialisationCreate(BaseModel):
    email: EmailStr


class DemandeReinitialisationOut(BaseModel):
    id: int
    email: str
    statut: str
    date_creation: datetime
    date_traitement: datetime | None = None
    traite_par: str | None = None

    class Config:
        from_attributes = True

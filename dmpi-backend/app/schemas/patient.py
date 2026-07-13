from pydantic import BaseModel, Field
from datetime import date, datetime
from enum import Enum


class Sexe(str, Enum):
    MASCULIN = "M"
    FEMININ = "F"


class GroupeSanguin(str, Enum):
    A_POSITIF = "A+"
    A_NEGATIF = "A-"
    B_POSITIF = "B+"
    B_NEGATIF = "B-"
    AB_POSITIF = "AB+"
    AB_NEGATIF = "AB-"
    O_POSITIF = "O+"
    O_NEGATIF = "O-"


class PatientBase(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    nom: str
    prenom: str
    date_naissance: date
    sexe: Sexe
    groupe_sanguin: GroupeSanguin | None = None


class PatientCreate(PatientBase):
    pass


class PatientOut(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
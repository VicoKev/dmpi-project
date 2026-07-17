from pydantic import BaseModel, Field, field_validator
from datetime import datetime


def _valider_npi(v: str) -> str:
    if not v.isdigit():
        raise ValueError("Le NPI doit être composé d'exactement 10 chiffres.")
    return v


def _valider_date_future(v: datetime) -> datetime:
    if v.tzinfo is not None:
        v = v.replace(tzinfo=None)
    if v <= datetime.utcnow():
        raise ValueError("La date et l'heure du rendez-vous doivent être dans le futur.")
    return v


class RendezVousCreate(BaseModel):
    npi_patient: str = Field(..., min_length=10, max_length=10)
    nom_patient: str
    prenom_patient: str
    date_rdv: datetime
    duree_minutes: int = Field(30, ge=5, le=240)
    motif: str = Field(..., min_length=1)
    notes: str | None = None

    _npi_valide = field_validator("npi_patient")(_valider_npi)
    _date_future = field_validator("date_rdv")(_valider_date_future)


class RendezVousUpdate(BaseModel):
    date_rdv: datetime
    duree_minutes: int = Field(30, ge=5, le=240)
    motif: str = Field(..., min_length=1)
    notes: str | None = None

    _date_future = field_validator("date_rdv")(_valider_date_future)


class SignalerEmpechementRequest(BaseModel):
    message: str | None = Field(None, max_length=280)

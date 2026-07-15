from pydantic import BaseModel, Field
from datetime import datetime


class FileAttenteCreate(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    motif_bref: str
    priorite: str = "normale"  # "normale" | "urgente"
    medecin_email: str | None = None  # assignation immédiate si renseigné, sinon "en_attente"


class AssignerMedecinRequest(BaseModel):
    medecin_email: str


class DisponibiliteRequest(BaseModel):
    disponible: bool


class FileAttenteOut(BaseModel):
    id: str
    npi: str
    nom: str
    prenom: str
    etablissement_id: str | None = None
    infirmier_email: str
    medecin_email: str | None = None
    motif_bref: str
    priorite: str
    statut: str  # "en_attente" | "assigne" | "en_consultation" | "termine"
    date_creation: datetime
    date_assignation: datetime | None = None
    date_prise_en_charge: datetime | None = None
    date_fin: datetime | None = None

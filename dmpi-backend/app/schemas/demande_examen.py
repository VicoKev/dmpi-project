from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from app.types_examen_data import TYPES_EXAMEN_VALIDES


class DemandeExamenCreate(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$", description="Le NPI à 10 chiffres du patient")
    prestataire_id: str = Field(..., description="Laboratoire destinataire, choisi dans l'annuaire des partenaires")
    type_examen: str = Field(..., description="Choisi dans le catalogue — voir GET /demandes-examen/types-disponibles")
    motif: str | None = None

    @field_validator("type_examen")
    @classmethod
    def type_examen_valide(cls, v: str) -> str:
        if v not in TYPES_EXAMEN_VALIDES:
            raise ValueError("Type d'examen inconnu — choisissez une valeur du catalogue.")
        return v


class DemandeExamenOut(BaseModel):
    id: str
    npi: str
    prestataire_id: str
    prestataire_nom: str | None = None
    type_examen: str
    motif: str | None = None
    medecin_email: str
    statut: str = "en_attente"  # "en_attente" | "traitee" | "annulee"
    # Signal non bloquant du laboratoire — distinct de statut : la demande
    # reste "en_attente" et peut toujours recevoir un résultat plus tard
    # (ex: échantillon rejeté puis un nouveau prélèvement déposé), mais le
    # médecin est informé qu'il y a un problème plutôt qu'un simple délai.
    probleme_signale: bool = False
    motif_probleme: str | None = None
    created_at: datetime


class SignalerProblemeExamenRequest(BaseModel):
    motif: str | None = Field(None, max_length=280)

from pydantic import BaseModel, Field
from datetime import datetime


class SignalerCorrectionRequest(BaseModel):
    """Auto-service : l'utilisateur connecté signale une erreur sur ses
    propres informations (faute de frappe, mauvaise spécialité...) —
    lui-même ne peut pas les corriger, seul le super_admin le peut."""
    motif: str = Field(..., min_length=5, max_length=500)


class SignalementCorrectionOut(BaseModel):
    id: int
    utilisateur_id: int
    motif: str
    statut: str
    date_creation: datetime
    date_traitement: datetime | None = None
    traite_par: str | None = None
    vu: bool

    class Config:
        from_attributes = True


class SignalementCorrectionAvecUtilisateurOut(SignalementCorrectionOut):
    """Vue super_admin : inclut de quoi identifier le compte concerné sans
    aller-retour supplémentaire côté frontend."""
    utilisateur_email: str
    utilisateur_nom: str
    utilisateur_prenom: str

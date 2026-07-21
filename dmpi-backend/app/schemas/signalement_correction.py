from pydantic import BaseModel
from datetime import datetime


class SignalementCorrectionOut(BaseModel):
    id: int
    utilisateur_id: int
    motif: str
    statut: str
    date_creation: datetime
    date_traitement: datetime | None = None
    traite_par: str | None = None
    vu: bool
    # Nom du fichier déposé à l'appui du signalement — jamais le chemin de
    # stockage, qui ne doit être connu que du backend (voir la route de
    # téléchargement, seule à y avoir accès). None uniquement pour les
    # signalements créés avant que le justificatif ne devienne obligatoire.
    document_nom_original: str | None = None

    class Config:
        from_attributes = True


class SignalementCorrectionAvecUtilisateurOut(SignalementCorrectionOut):
    """Vue super_admin : inclut de quoi identifier le compte concerné sans
    aller-retour supplémentaire côté frontend."""
    utilisateur_email: str
    utilisateur_nom: str
    utilisateur_prenom: str

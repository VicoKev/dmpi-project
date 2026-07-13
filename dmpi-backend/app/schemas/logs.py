from pydantic import BaseModel
from datetime import datetime


class AuditLogOut(BaseModel):
    """Schéma de sortie pour la console d'audit (GET /admin/logs)."""
    id: int
    utilisateur_email: str
    utilisateur_nom_complet: str | None = None
    utilisateur_role: str | None = None
    action: str
    npi_concerne: str | None = None
    statut_action: str
    horodatage: datetime
    adresse_ip: str | None = None

    class Config:
        from_attributes = True
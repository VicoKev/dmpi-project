from pydantic import BaseModel, Field
from datetime import datetime


class ConstantesVitales(BaseModel):
    """Relevé de constantes vitales saisi par un infirmier ou un médecin."""
    npi: str = Field(..., min_length=10, max_length=10, description="Le NPI à 10 chiffres du patient")
    tension_arterielle: str = Field(..., description="Ex: 120/80")
    pouls: int = Field(..., gt=0, description="Fréquence cardiaque en battements par minute")
    temperature: float = Field(..., description="Température corporelle en °C")
    saturation_oxygene: int | None = Field(None, ge=0, le=100, description="SpO2 en %")
    notes: str | None = None
    releve_par: str | None = None  # renseigné automatiquement côté serveur
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AdministrationTraitement(BaseModel):
    """Validation par un infirmier de l'administration d'un traitement prescrit."""
    npi: str = Field(..., min_length=10, max_length=10)
    consultation_id: str | None = Field(None, description="ID Mongo de la consultation contenant l'ordonnance")
    nom_medicament: str
    dosage: str | None = None
    voie_administration: str | None = None
    statut: str = "administre"  # "administre" | "refuse" | "reporte"
    notes: str | None = None
    administre_par: str | None = None  # renseigné automatiquement côté serveur
    horodatage: datetime = Field(default_factory=datetime.utcnow)
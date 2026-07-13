from pydantic import BaseModel, Field
from datetime import datetime

class MedicamentPrescrit(BaseModel):
    nom_medicament: str  # ex: Paracétamol 500mg
    posologie: str       # ex: 1 comprimé 3 fois par jour
    duree: str           # ex: 5 jours

class OrdonnanceMongo(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, description="Le NPI à 10 chiffres du patient")
    consultation_id: str | None = Field(None, description="ID de la consultation associée, s'il y en a une")
    traitements: list[MedicamentPrescrit] = []
    notes_additionnelles: str | None = None
    auteur: str | None = Field(None, description="Email du médecin prescripteur")
    created_at: datetime = Field(default_factory=datetime.utcnow)

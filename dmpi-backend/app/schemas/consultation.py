from pydantic import BaseModel, Field
from datetime import datetime

class ConsultationMongo(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$", description="Le NPI à 10 chiffres du patient")
    motif: str = Field(..., description="Motif de la consultation")
    diagnostic_cim10: str = Field(..., description="Diagnostic codifié selon la norme CIM-10")
    conclusion: str = Field(..., description="Conclusion ou décision médicale")
    releve_par: str | None = Field(None, description="Email du médecin")
    etablissement_id: str | None = Field(None, description="ID de l'établissement")
    created_at: datetime = Field(default_factory=datetime.utcnow)
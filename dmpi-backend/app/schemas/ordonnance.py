from pydantic import BaseModel, Field
from datetime import datetime

class MedicamentPrescrit(BaseModel):
    nom_medicament: str  # ex: Paracétamol 500mg
    posologie: str       # ex: 1 comprimé 3 fois par jour
    duree: str           # ex: 5 jours
    renouvelable: bool = False  # le médecin autorise un renouvellement sans nouvelle consultation

class OrdonnanceMongo(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, description="Le NPI à 10 chiffres du patient")
    consultation_id: str | None = Field(None, description="ID de la consultation associée, s'il y en a une")
    traitements: list[MedicamentPrescrit] = []
    notes_additionnelles: str | None = None
    auteur: str | None = Field(None, description="Email du médecin prescripteur")
    renouvelee_depuis: str | None = Field(None, description="ID de l'ordonnance d'origine, si créée par renouvellement")
    renouvelee_depuis_index: int | None = Field(
        None,
        description="Position du médicament renouvelé dans les traitements de l'ordonnance d'origine "
                     "(None = renouvellement groupé historique, portait sur tous les médicaments renouvelables)."
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RenouvellementRequest(BaseModel):
    medicament_index: int | None = Field(
        None,
        description="Position du médicament à renouveler dans les traitements de l'ordonnance. "
                     "Si omis, tous les médicaments renouvelables sont renouvelés ensemble."
    )


class OrdonnanceOut(OrdonnanceMongo):
    """Ordonnance telle que renvoyée par l'API — inclut l'id Mongo (absent de
    OrdonnanceMongo, qui sert aussi de modèle d'entrée) et le nom de
    l'établissement prescripteur, résolu depuis l'auteur."""
    id: str
    etablissement_nom: str | None = None

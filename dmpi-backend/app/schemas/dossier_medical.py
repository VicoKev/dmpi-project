from pydantic import BaseModel, Field
from datetime import datetime, date
from app.schemas.patient import GroupeSanguin


class Allergie(BaseModel):
    substance: str
    severite: str
    notes: str | None = None


class TraitementEnCours(BaseModel):
    """Traitement chronique ou en cours, distinct de l'ordonnance ponctuelle d'une consultation."""
    nom_medicament: str
    posologie: str
    indication: str | None = None


class DossierMedicalMongo(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10)
    nom: str | None = None
    prenom: str | None = None
    date_naissance: date | None = None
    sexe: str | None = None
    groupe_sanguin: GroupeSanguin | None = None
    allergies: list[Allergie] = []
    antecedents: list[str] = []
    traitements_en_cours: list[TraitementEnCours] = []
    updated_at: datetime

class FicheUrgence(BaseModel):
    """ Vue filtrée pour le mode urgence : uniquement les données vitales."""
    npi: str
    nom: str | None = None
    prenom: str | None = None
    date_naissance: date | None = None
    sexe: str | None = None
    groupe_sanguin: GroupeSanguin | None = None
    allergies: list[Allergie] = []
    antecedents: list[str] = []
    traitements_en_cours: list[TraitementEnCours] = []

class DossierMedicalUpdate(BaseModel):
    """Schéma d'entrée pour la mise à jour d'un dossier — sans updated_at, calculé côté serveur."""
    npi: str = Field(..., min_length=10, max_length=10)
    nom: str | None = None
    prenom: str | None = None
    date_naissance: date | None = None
    sexe: str | None = None
    groupe_sanguin: GroupeSanguin | None = None
    allergies: list[Allergie] = []
    antecedents: list[str] = []
    traitements_en_cours: list[TraitementEnCours] = []
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime, date
from app.schemas.patient import GroupeSanguin


class SeveriteAllergie(str, Enum):
    LEGERE = "legere"
    MODEREE = "moderee"
    SEVERE = "severe"
    ANAPHYLAXIE = "anaphylaxie"


class Allergie(BaseModel):
    substance: str
    severite: SeveriteAllergie
    notes: str | None = None


class TraitementEnCours(BaseModel):
    """Traitement chronique ou en cours, distinct de l'ordonnance ponctuelle d'une consultation.
    Reste dans cette liste après son arrêt (actif=False) pour préserver l'historique —
    seule la vue active en est filtrée."""
    nom_medicament: str
    posologie: str
    indication: str | None = None
    actif: bool = True
    date_arret: datetime | None = None
    motif_arret: str | None = None


class ArreterTraitementRequest(BaseModel):
    motif: str | None = Field(None, max_length=280)


class Tuteur(BaseModel):
    """Contact d'un parent/tuteur légal — utilisé pour les mineurs et nouveau-nés sans moyen de contact propre."""
    nom: str
    telephone: str
    lien_parente: str


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
    tuteur: Tuteur | None = None
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
    tuteur: Tuteur | None = None
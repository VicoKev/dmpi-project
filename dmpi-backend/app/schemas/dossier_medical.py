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
    # Lien vers la ligne d'ordonnance à l'origine de cette entrée — absent sur
    # les entrées créées avant l'introduction de ce champ, auquel cas
    # l'appariement se fait par nom de médicament côté frontend.
    ordonnance_id: str | None = None
    ligne_index: int | None = None


class ArreterTraitementRequest(BaseModel):
    motif: str | None = Field(None, max_length=280)


class Tuteur(BaseModel):
    """Contact d'un parent/tuteur légal — utilisé pour les mineurs et nouveau-nés sans moyen de contact propre."""
    nom: str
    telephone: str
    lien_parente: str


class Vaccination(BaseModel):
    """Entrée du carnet de vaccination. Journal historique : une entrée
    n'est jamais modifiée ni supprimée, seulement ajoutée — au même titre
    qu'un acte médical déjà administré."""
    nom_vaccin: str
    date_administration: date
    dose: str | None = None  # ex: "1ère dose", "2ème dose", "rappel"
    lot: str | None = None
    prochaine_dose_prevue: date | None = None
    notes: str | None = None
    # Renseigné côté serveur depuis l'utilisateur authentifié, jamais saisi par le client.
    administre_par: str | None = None


class VaccinationCreate(BaseModel):
    nom_vaccin: str
    date_administration: date
    dose: str | None = None
    lot: str | None = None
    prochaine_dose_prevue: date | None = None
    notes: str | None = None


class DossierMedicalMongo(BaseModel):
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    nom: str | None = None
    prenom: str | None = None
    date_naissance: date | None = None
    sexe: str | None = None
    groupe_sanguin: GroupeSanguin | None = None
    allergies: list[Allergie] = []
    antecedents: list[str] = []
    traitements_en_cours: list[TraitementEnCours] = []
    vaccinations: list[Vaccination] = []
    tuteur: Tuteur | None = None
    updated_at: datetime


class RechercheDossierResultat(BaseModel):
    """Vue allégée d'un dossier retrouvé par nom — sert uniquement à
    identifier le bon NPI, jamais à afficher des données cliniques."""
    npi: str
    nom: str | None = None
    prenom: str | None = None
    date_naissance: date | None = None
    sexe: str | None = None

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
    npi: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    nom: str | None = None
    prenom: str | None = None
    date_naissance: date | None = None
    sexe: str | None = None
    groupe_sanguin: GroupeSanguin | None = None
    allergies: list[Allergie] = []
    antecedents: list[str] = []
    traitements_en_cours: list[TraitementEnCours] = []
    tuteur: Tuteur | None = None
from pydantic import BaseModel
from datetime import datetime

TYPES_DOCUMENT_VALIDES = {
    "radiographie", "scanner", "echographie", "irm",
    "biologie", "anatomopathologie", "ecg", "autre",
}


class FichierMedicalOut(BaseModel):
    id: str
    nom_original: str
    type_mime: str
    taille_octets: int
    a_une_vignette: bool


class DocumentMedicalOut(BaseModel):
    id: str
    npi: str
    demande_examen_id: str | None = None
    type: str
    libelle: str
    date_realisation: datetime
    laboratoire_nom: str | None = None
    prestataire_id: str | None = None
    uploade_par_email: str
    uploade_par_role: str  # "medecin" | "laboratoire"
    commentaire: str | None = None
    # Interprétation clinique laissée par un médecin — distincte de
    # `commentaire` (la note de celui qui a déposé le document, souvent le
    # labo) : elle garde une trace écrite de l'explication du résultat au
    # patient, au lieu que ce soit uniquement fait à l'oral.
    interpretation_medecin: str | None = None
    interpretation_par_email: str | None = None
    fichiers: list[FichierMedicalOut]
    statut: str = "disponible"  # "disponible" | "archive"
    created_at: datetime
    updated_at: datetime | None = None


class InterpretationUpdate(BaseModel):
    interpretation_medecin: str

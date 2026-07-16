from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class EtablissementBase(BaseModel):
    nom: str
    ville: str
    departement: str
    commune: str | None = None
    arrondissement: str | None = None
    quartier: str | None = None
    adresse: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    type: str  # "CHU", "CHD", "CSC", "Clinique", "Maternite"
    statut: str = "actif"  # "actif", "maintenance", "inactif"
    telephone: str
    dmpiVersion: str | None = None

    # Stats (idéalement calculées, mais stockées pour l'MVP)
    patients: int = 0
    medecins: int = 0
    infirmiers: int = 0
    consultationsMois: int = 0

class EtablissementCreate(EtablissementBase):
    # Requis à la création uniquement — EtablissementBase les garde optionnels
    # car il est aussi hérité par EtablissementOut, qui doit pouvoir sérialiser
    # les établissements existants créés avant cette contrainte.
    commune: str
    arrondissement: str
    quartier: str

class EtablissementUpdate(BaseModel):
    nom: Optional[str] = None
    ville: Optional[str] = None
    departement: Optional[str] = None
    commune: Optional[str] = None
    arrondissement: Optional[str] = None
    quartier: Optional[str] = None
    adresse: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    type: Optional[str] = None
    statut: Optional[str] = None
    telephone: Optional[str] = None
    dmpiVersion: Optional[str] = None
    patients: Optional[int] = None
    medecins: Optional[int] = None
    infirmiers: Optional[int] = None
    consultationsMois: Optional[int] = None

class EtablissementUpdateSelfService(BaseModel):
    """
    Champs qu'un admin_etablissement peut modifier sur son propre établissement
    (via /etablissements/moi) — uniquement les coordonnées et la localisation,
    pas le nom, le type, le statut ni les compteurs (gouvernance du super_admin).
    """
    ville: Optional[str] = None
    departement: Optional[str] = None
    commune: Optional[str] = None
    arrondissement: Optional[str] = None
    quartier: Optional[str] = None
    adresse: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    telephone: Optional[str] = None

class EtablissementOut(EtablissementBase):
    id: str
    derniereSync: datetime
    directeur: str | None = None  # calculé depuis les comptes admin_etablissement rattachés, jamais stocké

    class Config:
        from_attributes = True
        populate_by_name = True

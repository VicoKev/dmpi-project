from pydantic import BaseModel
from datetime import datetime


class PrestataireBase(BaseModel):
    nom: str
    types: list[str] = ["pharmacie"]  # v1 : toujours "pharmacie" — liste pour permettre labo/imagerie en phase 2
    departement: str
    commune: str | None = None
    arrondissement: str | None = None
    quartier: str | None = None
    adresse: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    telephone: str
    email: str | None = None
    horaires: str | None = None
    etablissement_rattachement_id: str | None = None  # si intégrée à un établissement de santé existant
    statut: str = "actif"  # "actif" | "inactif"
    source_donnees: str = "saisi_super_admin"
    derniere_verification: datetime | None = None


class PrestataireCreate(PrestataireBase):
    pass


class PrestataireUpdate(BaseModel):
    nom: str | None = None
    types: list[str] | None = None
    departement: str | None = None
    commune: str | None = None
    arrondissement: str | None = None
    quartier: str | None = None
    adresse: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    telephone: str | None = None
    email: str | None = None
    horaires: str | None = None
    etablissement_rattachement_id: str | None = None
    statut: str | None = None
    source_donnees: str | None = None
    derniere_verification: datetime | None = None


class PrestataireOut(PrestataireBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PharmacieProche(BaseModel):
    id: str
    nom: str
    adresse: str | None = None
    commune: str | None = None
    latitude: float
    longitude: float
    telephone: str
    horaires: str | None = None
    distance_km: float
    derniere_verification: datetime | None = None


class ReferenceLocalisation(BaseModel):
    latitude: float
    longitude: float
    source: str  # "etablissement_prescripteur" | "position_utilisateur"


class PharmaciesProchesResponse(BaseModel):
    reference: ReferenceLocalisation | None
    pharmacies: list[PharmacieProche]

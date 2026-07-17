from pydantic import BaseModel, Field, field_validator
from datetime import datetime

TYPES_PRESTATAIRE_VALIDES = {"pharmacie", "laboratoire"}


def _valider_type(type_prestataire: str) -> str:
    if type_prestataire not in TYPES_PRESTATAIRE_VALIDES:
        raise ValueError(
            f"Type de prestataire invalide : {type_prestataire}. "
            f"Valeurs autorisées : {', '.join(TYPES_PRESTATAIRE_VALIDES)}."
        )
    return type_prestataire


class PrestataireBase(BaseModel):
    nom: str
    # Un seul type par prestataire : une pharmacie n'est pas un laboratoire
    # et inversement, ce sont deux métiers distincts sur le terrain.
    type: str = "pharmacie"
    departement: str
    commune: str | None = None
    arrondissement: str | None = None
    quartier: str | None = None
    adresse: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    telephone: str
    email: str | None = None
    horaires: str | None = None
    etablissement_rattachement_id: str | None = None  # si intégrée à un établissement de santé existant
    statut: str = "actif"  # "actif" | "inactif"
    source_donnees: str = "saisi_super_admin"
    derniere_verification: datetime | None = None

    @field_validator("type")
    @classmethod
    def type_valide(cls, v: str) -> str:
        return _valider_type(v)


class PrestataireCreate(PrestataireBase):
    pass


class PrestataireUpdate(BaseModel):
    nom: str | None = None
    type: str | None = None
    departement: str | None = None
    commune: str | None = None
    arrondissement: str | None = None
    quartier: str | None = None
    adresse: str | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    telephone: str | None = None
    email: str | None = None
    horaires: str | None = None
    etablissement_rattachement_id: str | None = None
    statut: str | None = None
    source_donnees: str | None = None
    derniere_verification: datetime | None = None

    @field_validator("type")
    @classmethod
    def type_valide(cls, v: str | None) -> str | None:
        return _valider_type(v) if v is not None else v


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

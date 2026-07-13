from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class EtablissementBase(BaseModel):
    nom: str
    ville: str
    departement: str
    type: str  # "CHU", "CHD", "CSC", "Clinique", "Maternite"
    statut: str = "actif"  # "actif", "maintenance", "inactif"
    directeur: str | None = None
    telephone: str
    dmpiVersion: str | None = None
    
    # Stats (idéalement calculées, mais stockées pour l'MVP)
    patients: int = 0
    medecins: int = 0
    infirmiers: int = 0
    consultationsMois: int = 0

class EtablissementCreate(EtablissementBase):
    pass

class EtablissementUpdate(BaseModel):
    nom: Optional[str] = None
    ville: Optional[str] = None
    departement: Optional[str] = None
    type: Optional[str] = None
    statut: Optional[str] = None
    directeur: Optional[str] = None
    telephone: Optional[str] = None
    dmpiVersion: Optional[str] = None
    patients: Optional[int] = None
    medecins: Optional[int] = None
    infirmiers: Optional[int] = None
    consultationsMois: Optional[int] = None

class EtablissementOut(EtablissementBase):
    id: str
    derniereSync: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

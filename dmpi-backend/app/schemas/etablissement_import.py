from pydantic import BaseModel
from app.schemas.etablissement import EtablissementCreate


class LigneImportValide(BaseModel):
    numero_ligne: int  # numéro de ligne dans le fichier Excel (1 = première ligne de données, après l'en-tête)
    donnees: EtablissementCreate


class LigneImportInvalide(BaseModel):
    numero_ligne: int
    valeurs_brutes: dict[str, str | None]
    erreurs: list[str]


class RapportValidationImport(BaseModel):
    total_lignes: int
    nombre_valides: int
    nombre_invalides: int
    lignes_valides: list[LigneImportValide]
    lignes_invalides: list[LigneImportInvalide]


class ConfirmerImportRequest(BaseModel):
    lignes: list[LigneImportValide]


class LigneImportCreee(BaseModel):
    numero_ligne: int
    id: str
    nom: str


class ConfirmerImportResponse(BaseModel):
    nombre_crees: int
    etablissements_crees: list[LigneImportCreee]

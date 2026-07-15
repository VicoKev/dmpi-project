import { apiFetch } from "./api";

export interface Departement {
  id_dep: number;
  lib_dep: string;
}

export interface Commune {
  id_com: number;
  lib_com: string;
  id_dep: number;
}

export interface Arrondissement {
  id_arrond: number;
  lib_arrond: string;
  id_com: number;
}

export interface Quartier {
  id_quart: number;
  lib_quart: string;
  id_arrond: number;
}

export async function getDepartements(): Promise<Departement[]> {
  return apiFetch<Departement[]>("/territoire/departements");
}

export async function getCommunes(departementId: number): Promise<Commune[]> {
  return apiFetch<Commune[]>(`/territoire/communes?departement_id=${departementId}`);
}

export async function getArrondissements(communeId: number): Promise<Arrondissement[]> {
  return apiFetch<Arrondissement[]>(`/territoire/arrondissements?commune_id=${communeId}`);
}

export async function getQuartiers(arrondissementId: number): Promise<Quartier[]> {
  return apiFetch<Quartier[]>(`/territoire/quartiers?arrondissement_id=${arrondissementId}`);
}

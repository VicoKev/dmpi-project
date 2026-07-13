import { apiFetch } from "./api";

export interface Etablissement {
  id: string;
  nom: string;
  ville: string;
  departement: string;
  type: "CHU" | "CHD" | "CSC" | "Clinique" | "Maternite";
  statut: "actif" | "maintenance" | "inactif";
  patients: number;
  medecins: number;
  infirmiers: number;
  consultationsMois: number;
  directeur: string;
  telephone: string;
  derniereSync: string;
  dmpiVersion: string;
}

export interface EtablissementCreatePayload {
  nom: string;
  ville: string;
  departement: string;
  type: string;
  statut: string;
  directeur: string;
  telephone: string;
  dmpiVersion: string;
  patients: number;
  medecins: number;
  infirmiers: number;
  consultationsMois: number;
}

export interface EtablissementUpdatePayload {
  nom?: string;
  ville?: string;
  departement?: string;
  type?: string;
  statut?: string;
  directeur?: string;
  telephone?: string;
  dmpiVersion?: string;
  patients?: number;
  medecins?: number;
  infirmiers?: number;
  consultationsMois?: number;
}

export const TYPE_OPTIONS = ["CHU", "CHD", "CSC", "Clinique", "Maternite"] as const;
export const STATUT_OPTIONS = ["actif", "maintenance", "inactif"] as const;
export const DEPARTEMENTS_BENIN = [
  "Alibori", "Atacora", "Atlantique", "Borgou", "Collines",
  "Couffo", "Donga", "Littoral", "Mono", "Oueme", "Plateau", "Zou"
];

export async function getEtablissements(): Promise<Etablissement[]> {
  return apiFetch<Etablissement[]>("/etablissements/");
}

export async function createEtablissement(payload: EtablissementCreatePayload): Promise<Etablissement> {
  return apiFetch<Etablissement>("/etablissements/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEtablissement(id: string, payload: EtablissementUpdatePayload): Promise<Etablissement> {
  return apiFetch<Etablissement>(`/etablissements/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteEtablissement(id: string): Promise<void> {
  return apiFetch<void>(`/etablissements/${id}`, { method: "DELETE" });
}

export async function reactivateEtablissement(id: string): Promise<void> {
  return apiFetch<void>(`/etablissements/${id}/reactivate`, { method: "POST" });
}

import { apiFetch } from "./api";

export interface Etablissement {
  id: string;
  nom: string;
  ville: string;
  departement: string;
  commune?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: "CHU" | "CHD" | "CSC" | "Clinique" | "Maternite";
  statut: "actif" | "maintenance" | "inactif";
  patients: number;
  medecins: number;
  infirmiers: number;
  consultationsMois: number;
  directeur: string | null;
  telephone: string;
  derniereSync: string;
  dmpiVersion: string;
}

export interface EtablissementCreatePayload {
  nom: string;
  ville: string;
  departement: string;
  commune?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  statut: string;
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
  commune?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type?: string;
  statut?: string;
  telephone?: string;
  dmpiVersion?: string;
  patients?: number;
  medecins?: number;
  infirmiers?: number;
  consultationsMois?: number;
}

export interface EtablissementUpdateSelfServicePayload {
  ville?: string;
  departement?: string;
  commune?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telephone?: string;
}

export const TYPE_OPTIONS = ["CHU", "CHD", "CSC", "Clinique", "Maternite"] as const;
export const STATUT_OPTIONS = ["actif", "maintenance", "inactif"] as const;

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

export async function getMonEtablissement(): Promise<Etablissement> {
  return apiFetch<Etablissement>("/etablissements/moi");
}

export async function updateMonEtablissement(payload: EtablissementUpdateSelfServicePayload): Promise<Etablissement> {
  return apiFetch<Etablissement>("/etablissements/moi", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

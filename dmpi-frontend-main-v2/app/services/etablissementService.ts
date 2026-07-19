import { apiFetch, apiUpload, apiDownload } from "./api";
import type { ReferenceLocalisation } from "./prescriptionService";

export interface Etablissement {
  id: string;
  nom: string;
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

export interface EtablissementProche {
  id: string;
  nom: string;
  type: "CHU" | "CHD" | "CSC" | "Clinique" | "Maternite";
  departement: string;
  commune?: string | null;
  adresse?: string | null;
  telephone: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

export interface EtablissementsProchesResponse {
  reference: ReferenceLocalisation | null;
  etablissements: EtablissementProche[];
}

/** Établissements de santé actifs les plus proches d'une position donnée —
 * un premier indice pour un patient qui cherche où se rendre rapidement,
 * pas une garantie de plateau technique adapté à son besoin. */
export async function getEtablissementsProches(position: { latitude: number; longitude: number }, limite = 5): Promise<EtablissementsProchesResponse> {
  const params = new URLSearchParams({
    latitude: String(position.latitude),
    longitude: String(position.longitude),
    limite: String(limite),
  });
  return apiFetch<EtablissementsProchesResponse>(`/etablissements/proches?${params.toString()}`);
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

// ─── Import en masse depuis Excel ──────────────────────────────────────────

export interface EtablissementImportDonnees {
  nom: string;
  departement: string;
  commune: string;
  arrondissement: string;
  quartier: string;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
  type: string;
  statut: string;
  telephone: string;
  dmpiVersion: string | null;
  patients: number;
  medecins: number;
  infirmiers: number;
  consultationsMois: number;
}

export interface LigneImportValide {
  numero_ligne: number;
  donnees: EtablissementImportDonnees;
}

export interface LigneImportInvalide {
  numero_ligne: number;
  valeurs_brutes: Record<string, string | null>;
  erreurs: string[];
}

export interface RapportValidationImport {
  total_lignes: number;
  nombre_valides: number;
  nombre_invalides: number;
  lignes_valides: LigneImportValide[];
  lignes_invalides: LigneImportInvalide[];
}

export interface LigneImportCreee {
  numero_ligne: number;
  id: string;
  nom: string;
}

export interface ConfirmerImportResponse {
  nombre_crees: number;
  etablissements_crees: LigneImportCreee[];
}

export async function telechargerModeleImportEtablissements(): Promise<void> {
  return apiDownload("/etablissements/import/modele", "modele-import-etablissements.xlsx");
}

export async function validerImportEtablissements(fichier: File): Promise<RapportValidationImport> {
  const formData = new FormData();
  formData.append("fichier", fichier);
  return apiUpload<RapportValidationImport>("/etablissements/import/valider", formData);
}

export async function confirmerImportEtablissements(lignes: LigneImportValide[]): Promise<ConfirmerImportResponse> {
  return apiFetch<ConfirmerImportResponse>("/etablissements/import/confirmer", {
    method: "POST",
    body: JSON.stringify({ lignes }),
  });
}

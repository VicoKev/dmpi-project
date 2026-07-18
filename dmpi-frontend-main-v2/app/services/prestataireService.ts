import { apiFetch, apiFetchPagine, type ReponsePaginee } from "./api";

export interface Prestataire {
  id: string;
  nom: string;
  type: string;
  departement: string;
  commune?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telephone: string;
  email?: string | null;
  horaires?: string | null;
  etablissement_rattachement_id?: string | null;
  statut: "actif" | "inactif";
  source_donnees: string;
  derniere_verification?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrestataireCreatePayload {
  nom: string;
  type: string;
  departement: string;
  commune?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telephone: string;
  email?: string | null;
  horaires?: string | null;
  etablissement_rattachement_id?: string | null;
  statut?: string;
}

export interface PrestataireUpdatePayload {
  nom?: string;
  type?: string;
  departement?: string;
  commune?: string | null;
  arrondissement?: string | null;
  quartier?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  telephone?: string;
  email?: string | null;
  horaires?: string | null;
  etablissement_rattachement_id?: string | null;
  statut?: string;
}

export const TYPE_PRESTATAIRE_OPTIONS = ["pharmacie", "laboratoire"] as const;

export async function getPrestataires(): Promise<Prestataire[]> {
  return apiFetch<Prestataire[]>("/prestataires/");
}

/** Page de prestataires — pour la liste super admin, dont le nombre grandit
 * avec chaque nouvelle pharmacie ou laboratoire partenaire. */
export async function getPrestatairesPagine(skip: number, limit: number): Promise<ReponsePaginee<Prestataire>> {
  return apiFetchPagine<Prestataire>(`/prestataires/?skip=${skip}&limit=${limit}`);
}

export async function createPrestataire(payload: PrestataireCreatePayload): Promise<Prestataire> {
  return apiFetch<Prestataire>("/prestataires/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePrestataire(id: string, payload: PrestataireUpdatePayload): Promise<Prestataire> {
  return apiFetch<Prestataire>(`/prestataires/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deactivatePrestataire(id: string): Promise<void> {
  return apiFetch<void>(`/prestataires/${id}`, { method: "DELETE" });
}

export async function reactivatePrestataire(id: string): Promise<void> {
  return apiFetch<void>(`/prestataires/${id}/reactivate`, { method: "POST" });
}

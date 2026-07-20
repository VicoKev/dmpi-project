import { apiFetch, apiFetchPagine, type ReponsePaginee } from "./api";

export interface DemandeExamen {
  id: string;
  npi: string;
  prestataire_id: string;
  prestataire_nom: string | null;
  type_examen: string;
  motif: string | null;
  medecin_email: string;
  statut: "en_attente" | "traitee" | "annulee";
  /** Signal non bloquant du laboratoire — la demande reste "en_attente" et
   * peut toujours recevoir un résultat plus tard si la situation se résout. */
  probleme_signale: boolean;
  motif_probleme: string | null;
  created_at: string;
}

export interface DemandeExamenCreatePayload {
  npi: string;
  prestataire_id: string;
  type_examen: string;
  motif?: string | null;
}

/** Catalogue fermé des types d'examen prescriptibles, groupés par catégorie
 * (ex: "Biologie" -> ["Numération Formule Sanguine (NFS)", ...]). */
export type CatalogueTypesExamen = Record<string, string[]>;

export async function getTypesExamenDisponibles(): Promise<CatalogueTypesExamen> {
  return apiFetch<CatalogueTypesExamen>("/demandes-examen/types-disponibles");
}

export async function creerDemandeExamen(payload: DemandeExamenCreatePayload): Promise<DemandeExamen> {
  return apiFetch<DemandeExamen>("/demandes-examen/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDemandesExamenPatient(npi: string): Promise<DemandeExamen[]> {
  return apiFetch<DemandeExamen[]>(`/demandes-examen/patient/${npi}`);
}

export async function getMesDemandesLaboratoire(statut?: string): Promise<DemandeExamen[]> {
  const params = statut ? `?statut=${statut}` : "";
  return apiFetch<DemandeExamen[]>(`/demandes-examen/mes-demandes${params}`);
}

export async function getMesDemandesLaboratoirePaginee(skip: number, limit: number, statut?: string): Promise<ReponsePaginee<DemandeExamen>> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (statut) params.set("statut", statut);
  return apiFetchPagine<DemandeExamen>(`/demandes-examen/mes-demandes?${params.toString()}`);
}

/** Examens prescrits par le médecin connecté, tous patients confondus. */
export async function getMesPrescriptionsExamen(statut?: string): Promise<DemandeExamen[]> {
  const params = statut ? `?statut=${statut}` : "";
  return apiFetch<DemandeExamen[]>(`/demandes-examen/mes-prescriptions${params}`);
}

export async function getMesPrescriptionsExamenPaginee(skip: number, limit: number, statut?: string): Promise<ReponsePaginee<DemandeExamen>> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (statut) params.set("statut", statut);
  return apiFetchPagine<DemandeExamen>(`/demandes-examen/mes-prescriptions?${params.toString()}`);
}

export async function signalerProblemeExamen(demandeId: string, motif?: string): Promise<DemandeExamen> {
  return apiFetch<DemandeExamen>(`/demandes-examen/${demandeId}/signaler-probleme`, {
    method: "PATCH",
    body: JSON.stringify({ motif: motif?.trim() || undefined }),
  });
}

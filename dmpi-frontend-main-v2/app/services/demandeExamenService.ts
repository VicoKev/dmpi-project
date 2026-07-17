import { apiFetch } from "./api";

export interface DemandeExamen {
  id: string;
  npi: string;
  prestataire_id: string;
  prestataire_nom: string | null;
  type_examen: string;
  motif: string | null;
  medecin_email: string;
  statut: "en_attente" | "traitee" | "annulee";
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

export async function getMesDemandesLaboratoire(): Promise<DemandeExamen[]> {
  return apiFetch<DemandeExamen[]>("/demandes-examen/mes-demandes");
}

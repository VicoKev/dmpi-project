import { apiFetch } from "./api";

export interface DemandeAcces {
  id: number;
  npi: string;
  nom: string;
  prenom: string;
  telephone_contact: string;
  demandeur_email: string;
  etablissement_id: string | null;
  statut: "en_attente" | "traite" | "rejete" | "annulee";
  motif_rejet: string | null;
  date_creation: string;
}

export interface CreateDemandeAccesPayload {
  npi: string;
  nom: string;
  prenom: string;
  telephone_contact: string;
}

export async function createDemandeAcces(payload: CreateDemandeAccesPayload): Promise<DemandeAcces> {
  return apiFetch<DemandeAcces>("/demandes-acces/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDemandesAcces(statut: string = "en_attente"): Promise<DemandeAcces[]> {
  return apiFetch<DemandeAcces[]>(`/demandes-acces/?statut=${encodeURIComponent(statut)}`);
}

export async function rejeterDemandeAcces(id: number, motif?: string): Promise<DemandeAcces> {
  return apiFetch<DemandeAcces>(`/demandes-acces/${id}/rejeter`, {
    method: "PATCH",
    body: motif?.trim() ? JSON.stringify({ motif: motif.trim() }) : undefined,
  });
}

export async function getMesDemandesAcces(): Promise<DemandeAcces[]> {
  return apiFetch<DemandeAcces[]>("/demandes-acces/mes-demandes");
}

export async function annulerDemandeAcces(id: number): Promise<DemandeAcces> {
  return apiFetch<DemandeAcces>(`/demandes-acces/${id}/annuler`, { method: "PATCH" });
}

export async function compteExistantPourNpi(npi: string): Promise<boolean> {
  const result = await apiFetch<{ npi: string; a_un_compte: boolean }>(`/demandes-acces/compte-existant/${npi}`);
  return result.a_un_compte;
}

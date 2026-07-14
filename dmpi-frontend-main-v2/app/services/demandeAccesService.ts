import { apiFetch } from "./api";

export interface DemandeAcces {
  id: number;
  npi: string;
  nom: string;
  prenom: string;
  telephone_contact: string;
  demandeur_email: string;
  etablissement_id: string | null;
  statut: "en_attente" | "traite" | "rejete";
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

export async function rejeterDemandeAcces(id: number): Promise<DemandeAcces> {
  return apiFetch<DemandeAcces>(`/demandes-acces/${id}/rejeter`, { method: "PATCH" });
}

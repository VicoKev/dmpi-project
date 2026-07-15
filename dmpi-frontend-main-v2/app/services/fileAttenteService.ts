import { apiFetch } from "./api";

export interface EntreeFileAttente {
  id: string;
  npi: string;
  nom: string;
  prenom: string;
  etablissement_id: string | null;
  infirmier_email: string;
  medecin_email: string | null;
  motif_bref: string;
  priorite: "normale" | "urgente";
  statut: "en_attente" | "assigne" | "en_consultation" | "termine";
  date_creation: string;
  date_assignation: string | null;
  date_prise_en_charge: string | null;
  date_fin: string | null;
}

export interface MedecinDisponible {
  email: string;
  nom: string;
  prenom: string;
  specialite: string | null;
  disponible: boolean;
}

export interface AjouterFileAttentePayload {
  npi: string;
  motif_bref: string;
  priorite?: "normale" | "urgente";
  medecin_email?: string | null;
}

export async function ajouterFileAttente(payload: AjouterFileAttentePayload): Promise<EntreeFileAttente> {
  return apiFetch<EntreeFileAttente>("/file-attente/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFileAttenteEtablissement(): Promise<EntreeFileAttente[]> {
  return apiFetch<EntreeFileAttente[]>("/file-attente/etablissement");
}

export async function getMesPatientsAssignes(): Promise<EntreeFileAttente[]> {
  return apiFetch<EntreeFileAttente[]>("/file-attente/mes-patients");
}

export async function getMedecinsDisponibles(): Promise<MedecinDisponible[]> {
  return apiFetch<MedecinDisponible[]>("/file-attente/medecins-disponibles");
}

export async function assignerMedecin(entreeId: string, medecinEmail: string): Promise<EntreeFileAttente> {
  return apiFetch<EntreeFileAttente>(`/file-attente/${entreeId}/assigner`, {
    method: "PATCH",
    body: JSON.stringify({ medecin_email: medecinEmail }),
  });
}

export async function demarrerConsultation(entreeId: string): Promise<EntreeFileAttente> {
  return apiFetch<EntreeFileAttente>(`/file-attente/${entreeId}/demarrer`, { method: "PATCH" });
}

export async function terminerPriseEnCharge(entreeId: string): Promise<EntreeFileAttente> {
  return apiFetch<EntreeFileAttente>(`/file-attente/${entreeId}/terminer`, { method: "PATCH" });
}

export async function getMaDisponibilite(): Promise<boolean> {
  const res = await apiFetch<{ disponible: boolean }>("/file-attente/ma-disponibilite");
  return res.disponible;
}

export async function definirMaDisponibilite(disponible: boolean): Promise<boolean> {
  const res = await apiFetch<{ disponible: boolean }>("/file-attente/ma-disponibilite", {
    method: "PATCH",
    body: JSON.stringify({ disponible }),
  });
  return res.disponible;
}

import { apiFetch } from "./api";

export interface RendezVous {
  _id: string;
  npi_patient: string;
  nom_patient: string;
  prenom_patient: string;
  date_rdv: string;       // ISO string
  motif: string;
  notes?: string;
  medecin_email: string;
  medecin_nom: string;
  statut: "confirme" | "annule" | "complete";
  created_at: string;
}

export interface CreateRdvPayload {
  npi_patient: string;
  nom_patient: string;
  prenom_patient: string;
  date_rdv: string;
  motif: string;
  notes?: string;
}

export async function getRdvByPatient(npi: string): Promise<RendezVous[]> {
  try {
    return await apiFetch<RendezVous[]>(`/rdv/patient/${npi}`);
  } catch {
    return [];
  }
}

export async function getRdvByMedecin(email: string): Promise<RendezVous[]> {
  try {
    return await apiFetch<RendezVous[]>(`/rdv/medecin/${encodeURIComponent(email)}`);
  } catch {
    return [];
  }
}

export async function createRdv(payload: CreateRdvPayload): Promise<{ rdv_id: string }> {
  return apiFetch<{ rdv_id: string }>("/rdv/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function annulerRdv(rdvId: string): Promise<void> {
  await apiFetch(`/rdv/${rdvId}/annuler`, { method: "PATCH" });
}

export function isRdvPasse(rdv: RendezVous): boolean {
  return new Date(rdv.date_rdv) < new Date();
}

export function formatRdvDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatRdvTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

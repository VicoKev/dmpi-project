import { apiFetch } from "./api";

export interface RendezVous {
  _id: string;
  npi_patient: string;
  nom_patient: string;
  prenom_patient: string;
  date_rdv: string;       // ISO string
  duree_minutes: number;
  motif: string;
  notes?: string;
  medecin_email: string;
  medecin_nom: string;
  statut: "confirme" | "annule" | "complete";
  /** Reconnaissance du patient — distincte du statut administratif : un
   * médecin planifie le rendez-vous, mais le patient doit pouvoir signaler
   * que ça ne lui convient pas plutôt que de subir une décision à sens unique. */
  confirmation_patient: "en_attente" | "confirme" | "empechement";
  /** Message optionnel du patient lors d'un empêchement, pour indiquer au
   * médecin s'il doit attendre une nouvelle disponibilité ou reprogrammer
   * directement plutôt que de le deviner. */
  message_empechement?: string | null;
  created_at: string;
}

export interface CreateRdvPayload {
  npi_patient: string;
  nom_patient: string;
  prenom_patient: string;
  date_rdv: string;
  duree_minutes: number;
  motif: string;
  notes?: string;
}

export interface UpdateRdvPayload {
  date_rdv: string;
  duree_minutes: number;
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

export async function modifierRdv(rdvId: string, payload: UpdateRdvPayload): Promise<void> {
  await apiFetch(`/rdv/${rdvId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function annulerRdv(rdvId: string): Promise<void> {
  await apiFetch(`/rdv/${rdvId}/annuler`, { method: "PATCH" });
}

export async function terminerRdv(rdvId: string): Promise<void> {
  await apiFetch(`/rdv/${rdvId}/terminer`, { method: "PATCH" });
}

export async function confirmerPresence(rdvId: string): Promise<void> {
  await apiFetch(`/rdv/${rdvId}/confirmer-presence`, { method: "PATCH" });
}

export async function signalerEmpechement(rdvId: string, message?: string): Promise<void> {
  await apiFetch(`/rdv/${rdvId}/signaler-empechement`, {
    method: "PATCH",
    body: JSON.stringify({ message: message?.trim() || undefined }),
  });
}

export function isRdvPasse(rdv: RendezVous): boolean {
  return new Date(rdv.date_rdv) < new Date();
}

/** Un rendez-vous confirmé, déjà passé, pas encore marqué effectué : à clôturer. */
export function estACloturer(rdv: RendezVous): boolean {
  return rdv.statut === "confirme" && isRdvPasse(rdv);
}

/**
 * Sérialise une Date en chaîne "YYYY-MM-DDTHH:mm:ss" à partir de ses
 * composants LOCAUX, sans passer par toISOString() (qui convertit en UTC).
 * Le backend stocke date_rdv comme une heure murale naïve — la convertir en
 * UTC à l'envoi puis la relire comme heure locale à l'affichage décale
 * l'heure affichée du fuseau horaire local (ex: 13h → envoyé "12h" en UTC+1).
 */
export function versISOLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Date locale du jour au format "YYYY-MM-DD" (sans conversion UTC). */
export function dateLocaleAujourdhui(): string {
  return versISOLocal(new Date()).slice(0, 10);
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

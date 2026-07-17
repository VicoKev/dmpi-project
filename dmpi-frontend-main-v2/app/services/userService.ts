import { apiFetch } from "./api";

export const DOMAINE_EMAIL_AUTORISE = "dmpi.bj";

export function estEmailDomaineValide(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DOMAINE_EMAIL_AUTORISE}`);
}

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  est_actif: boolean;
  date_creation: string;
  derniere_connexion?: string | null;
  npi_patient?: string | null;
  specialite?: string | null;
  service?: string | null;
  etablissement_id?: string | null;
  prestataire_id?: string | null;
}

export interface UserCreatePayload {
  email: string;
  mot_de_passe: string;
  nom: string;
  prenom: string;
  role: string;
  npi_patient?: string | null;
  etablissement_id?: string | null;
  prestataire_id?: string | null;
  date_naissance?: string | null;
  sexe?: string | null;
  groupe_sanguin?: string | null;
  specialite?: string | null;
  service?: string | null;
}

export const ROLE_LABELS: Record<string, string> = {
  medecin: "Medecin",
  infirmier: "Infirmier",
  admin_etablissement: "Admin Etablissement",
  super_admin: "Super Admin",
  patient: "Patient",
  laboratoire: "Laboratoire",
};

export const ROLE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  medecin: { icon: "stethoscope", color: "var(--color-primary)", bg: "var(--color-primary-container)" },
  infirmier: { icon: "vaccines", color: "var(--color-tertiary)", bg: "var(--color-tertiary-container)" },
  admin_etablissement: { icon: "admin_panel_settings", color: "var(--color-secondary)", bg: "var(--color-secondary-container)" },
  super_admin: { icon: "shield_person", color: "#8B5CF6", bg: "#EDE9FE" },
  patient: { icon: "person", color: "var(--color-success)", bg: "var(--color-success-container)" },
  laboratoire: { icon: "biotech", color: "#0891B2", bg: "#CFFAFE" },
};

export const ROLES_SELECTABLE = [
  { value: "medecin", label: "Medecin" },
  { value: "infirmier", label: "Infirmier" },
  { value: "admin_etablissement", label: "Admin Etablissement" },
  { value: "super_admin", label: "Super Admin National" },
  { value: "patient", label: "Patient" },
  { value: "laboratoire", label: "Laboratoire" },
];

export async function getUsers(): Promise<User[]> {
  return apiFetch<User[]>("/admin/users");
}

export async function getUsersMonEtablissement(): Promise<User[]> {
  return apiFetch<User[]>("/admin/users/mon-etablissement");
}

export async function createUser(payload: UserCreatePayload): Promise<User> {
  return apiFetch<User>("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deactivateUser(userId: number): Promise<User> {
  return apiFetch<User>(`/admin/users/${userId}/desactiver`, {
    method: "PATCH",
  });
}

export async function reactivateUser(userId: number): Promise<User> {
  return apiFetch<User>(`/admin/users/${userId}/activer`, {
    method: "PATCH",
  });
}

export interface UserUpdatePayload {
  email?: string;
  nom?: string;
  prenom?: string;
  role?: string;
  npi_patient?: string | null;
  etablissement_id?: string | null;
  prestataire_id?: string | null;
}

export async function updateUser(userId: number, payload: UserUpdatePayload): Promise<User> {
  return apiFetch<User>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

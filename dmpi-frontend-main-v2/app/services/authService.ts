import type { AuthLoginResponse, LoginCredentials, UserRole } from "../types/auth";
import { apiFetch, storeToken, clearToken, getStoredToken } from "./api";
export { AuthError } from "./api";

const STORAGE_USER_KEY = "dmpi_user";

interface BackendUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  npi_patient?: string;
  est_actif: boolean;
  date_creation: string;
}

interface BackendLoginResponse {
  access_token: string;
  token_type: string;
  utilisateur: BackendUser;
}

const ROLE_MAP: Record<string, UserRole> = {
  medecin: "medecin",
  infirmier: "infirmier",
  patient: "patient",
  admin_etablissement: "admin_etablissement",
  super_admin: "superadmin_national",
  laboratoire: "laboratoire",
};

function mapBackendRole(backendRole: string): UserRole {
  return ROLE_MAP[backendRole] ?? ("medecin" as UserRole);
}

function mapLoginResponse(raw: BackendLoginResponse): AuthLoginResponse {
  return {
    access_token: raw.access_token,
    token_type: "bearer",
    expires_in: 7200,
    user: {
      id: String(raw.utilisateur.id),
      email: raw.utilisateur.email,
      nom: raw.utilisateur.nom,
      prenom: raw.utilisateur.prenom,
      role: mapBackendRole(raw.utilisateur.role),
      patientNpi: raw.utilisateur.npi_patient,
    },
  };
}

export async function login(credentials: LoginCredentials): Promise<AuthLoginResponse> {
  const raw = await apiFetch<BackendLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email,
      mot_de_passe: credentials.password,
    }),
  });

  const mapped = mapLoginResponse(raw);

  storeToken(mapped.access_token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(mapped.user));

  return mapped;
}

export async function logout(): Promise<void> {
  clearToken();
}

/** Signal "mot de passe oublié", avant authentification — transmis au super
 * admin, seul habilité à réinitialiser un mot de passe. La réponse est
 * volontairement la même que l'email corresponde ou non à un compte réel. */
export async function demanderReinitialisationMotDePasse(email: string): Promise<void> {
  await apiFetch("/auth/mot-de-passe-oublie", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Auto-service : l'utilisateur connecté change son propre mot de passe. */
export async function changerMonMotDePasse(ancienMotDePasse: string, nouveauMotDePasse: string): Promise<void> {
  await apiFetch("/auth/mon-mot-de-passe", {
    method: "PATCH",
    body: JSON.stringify({
      ancien_mot_de_passe: ancienMotDePasse,
      nouveau_mot_de_passe: nouveauMotDePasse,
    }),
  });
}

/** Auto-service : signale une erreur sur ses propres informations (nom,
 * spécialité...) — non modifiables par l'utilisateur lui-même, seul le
 * super_admin le peut. */
export async function signalerCorrectionCompte(motif: string): Promise<void> {
  await apiFetch("/auth/moi/signaler-correction", {
    method: "PATCH",
    body: JSON.stringify({ motif }),
  });
}

export interface SignalementCorrection {
  id: number;
  utilisateur_id: number;
  motif: string;
  statut: "en_attente" | "traitee";
  date_creation: string;
  date_traitement: string | null;
  traite_par: string | null;
  vu: boolean;
}

/** Historique des signalements de correction de l'utilisateur connecté —
 * les consulter marque les résolutions comme vues côté backend. */
export async function getMesSignalementsCorrection(): Promise<SignalementCorrection[]> {
  return apiFetch<SignalementCorrection[]>("/auth/mes-signalements-correction");
}

export function getCurrentUser(): AuthLoginResponse | null {
  const token = getStoredToken();
  const userStr = typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_USER_KEY)
    : null;

  if (!token || !userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return {
      access_token: token,
      token_type: "bearer",
      expires_in: 7200,
      user,
    };
  } catch {
    return null;
  }
}

export function hasRole(token: string | null, role: UserRole): boolean {
  if (!token) return false;
  const userStr = typeof localStorage !== "undefined"
    ? localStorage.getItem(STORAGE_USER_KEY)
    : null;
  if (!userStr) return false;
  try {
    const user = JSON.parse(userStr);
    return user.role === role;
  } catch {
    return false;
  }
}



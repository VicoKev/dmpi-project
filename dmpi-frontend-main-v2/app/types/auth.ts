// Types d'authentification — DMPI Frontend
// Structure calquée sur une vraie réponse API pour faciliter le branchement backend

export type UserRole =
  | "medecin"
  | "infirmier"
  | "patient"
  | "admin_etablissement"
  | "superadmin_national"
  | "laboratoire";

export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  /** NPI du médecin/infirmier (10 chiffres), null pour admin/patient */
  npi?: string;
  /** Nom de l'établissement de rattachement */
  etablissement?: string;
  /** URL avatar ou null */
  avatarUrl?: string;
  /** Pour les patients : leur propre NPI */
  patientNpi?: string;
}

/** Réponse de l'API auth — structure proche du backend FastAPI */
export interface AuthLoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number; // secondes
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Permissions par rôle */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  medecin: [
    "read:patient",
    "write:consultation",
    "write:prescription",
    "read:dossier",
    "write:dossier",
  ],
  infirmier: [
    "read:patient",
    "read:dossier",
    "write:constantes",
    "write:administration_medicament",
  ],
  patient: [
    "read:own_dossier",
    "export:dossier",
  ],
  admin_etablissement: [
    "read:stats_etablissement",
    "read:supervision",
  ],
  superadmin_national: [
    "manage:etablissements",
    "manage:utilisateurs",
    "read:audit",
    "read:monitoring",
    "read:rapports",
  ],
  laboratoire: [
    "read:demandes_examen",
    "write:document_medical",
  ],
};

/** Route de redirection par défaut selon le rôle */
export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  medecin: "/medecin",
  infirmier: "/infirmier",
  patient: "/patient",
  admin_etablissement: "/admin",
  superadmin_national: "/superadmin",
  laboratoire: "/laboratoire",
};

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

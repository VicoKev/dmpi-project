import { apiFetch } from "./api";

export interface StatEtablissement {
  totalPatients: number;
  consultationsMois: number;
  ordonnancesMois: number;
  medecinActifs: number;
  infirmierActifs: number;
}

export interface MembrePersonnel {
  nom: string;
  prenom: string;
  role: string;
  specialite: string | null;
  service: string | null;
  actif_aujourdhui: boolean;
}

export interface ActiviteRecente {
  id: string;
  type: "consultation" | "ordonnance" | "dossier";
  description: string;
  utilisateur: string;
  date: string;
}

export interface DashboardEtablissementResponse {
  stats: StatEtablissement;
  personnel: MembrePersonnel[];
  activite_recente: ActiviteRecente[];
  genere_le: string;
}

export async function getDashboardEtablissement(): Promise<DashboardEtablissementResponse> {
  const data = await apiFetch("/dashboard/etablissement");
  return data as DashboardEtablissementResponse;
}

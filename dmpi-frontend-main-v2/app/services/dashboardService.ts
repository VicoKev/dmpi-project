import { apiFetch } from "./api";

export interface StatEtablissement {
  totalPatients: number;
  consultationsMois: number;
  ordonnancesMois: number;
  medecinActifs: number;
  infirmierActifs: number;
  tauxOccupation: number;
}

export interface AlerteSysteme {
  id: string;
  type: "info" | "warning" | "error";
  message: string;
  date: string;
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
  alertes: AlerteSysteme[];
  activite_recente: ActiviteRecente[];
  genere_le: string;
}

export async function getDashboardEtablissement(): Promise<DashboardEtablissementResponse> {
  const data = await apiFetch("/dashboard/etablissement");
  return data as DashboardEtablissementResponse;
}

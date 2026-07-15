import { apiFetch, apiDownload } from "./api";

export interface ConsultationParMois {
  mois: string;
  consultations: number;
}

export interface TopDiagnosticEtablissement {
  code: string;
  libelle: string;
  count: number;
  pct: number;
}

export interface ActiviteParService {
  service: string;
  consultations: number;
  pct: number;
}

export interface StatistiquesEtablissement {
  etablissement: string;
  consultations_par_mois: ConsultationParMois[];
  top_diagnostics: TopDiagnosticEtablissement[];
  activite_par_service: ActiviteParService[];
  annee: number;
  genere_le: string;
}

export async function getStatistiquesEtablissement(): Promise<StatistiquesEtablissement> {
  return apiFetch<StatistiquesEtablissement>("/dashboard/etablissement/statistiques");
}

export async function telechargerStatistiquesPdf(annee: number): Promise<void> {
  return apiDownload("/dashboard/etablissement/statistiques/export/pdf", `statistiques-etablissement-${annee}.pdf`);
}

export async function telechargerStatistiquesExcel(annee: number): Promise<void> {
  return apiDownload("/dashboard/etablissement/statistiques/export/excel", `statistiques-etablissement-${annee}.xlsx`);
}

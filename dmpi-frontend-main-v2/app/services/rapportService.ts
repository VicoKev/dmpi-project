import { apiFetch, apiDownload } from "./api";

export interface CumulAnnuel {
  consultations_ytd: number;
  consultations_ytd_variation: number | null;
  patients_actifs: number;
  patients_actifs_variation: number | null;
  etablissements_actifs: number;
  etablissements_total: number;
  ordonnances_emises: number;
  ordonnances_emises_variation: number | null;
  alertes_securite: number;
  alertes_securite_variation: number;
}

export interface TopDiagnostic {
  code: string;
  libelle: string;
  count: number;
}

export interface TopEtablissementRapport {
  nom: string;
  consultations: number;
}

export interface RapportMensuel {
  mois: string;
  consultations: number;
  patients: number;
  ordonnances: number;
  etablissements: number;
  topDiagnostics: TopDiagnostic[];
  topEtablissements: TopEtablissementRapport[];
}

export interface RepartitionDepartement {
  departement: string;
  consultations: number;
  patients: number;
  etablissements_actifs: number;
  etablissements_total: number;
}

export interface RepartitionType {
  type: string;
  consultations: number;
  etablissements: number;
}

export interface RapportAnnuel {
  cumul_annuel: CumulAnnuel;
  rapports_mensuels: RapportMensuel[];
  repartition_departements: RepartitionDepartement[];
  repartition_types_etablissement: RepartitionType[];
  annee: number;
  genere_le: string;
}

export async function getRapportAnnuel(): Promise<RapportAnnuel> {
  return apiFetch<RapportAnnuel>("/dashboard/rapports-mensuels");
}

export async function telechargerRapportPdf(annee: number): Promise<void> {
  return apiDownload(`/dashboard/rapports-mensuels/export/pdf`, `rapport-annuel-dmpi-${annee}.pdf`);
}

export async function telechargerRapportExcel(annee: number): Promise<void> {
  return apiDownload(`/dashboard/rapports-mensuels/export/excel`, `rapport-annuel-dmpi-${annee}.xlsx`);
}

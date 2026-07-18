import { apiFetch } from "./api";

export interface AdministrationMedicament {
  id: string;
  patientNpi: string;
  infirmierId: string;
  infirmier: string;
  etablissement: string;
  date: string;
  medicament: string;
  dosage: string;
  voieAdministration: "orale" | "injectable" | "perfusion" | "cutanee" | "autre";
  statut: "administre" | "refuse" | "reporte";
  notes?: string;
}

export interface CreateAdministrationPayload {
  patientNpi: string;
  medicament: string;
  dosage: string;
  voieAdministration: AdministrationMedicament["voieAdministration"];
  statut: AdministrationMedicament["statut"];
  notes?: string;
  consultationId?: string;
}

export const VOIE_LABELS: Record<AdministrationMedicament["voieAdministration"], string> = {
  orale: "Voie orale",
  injectable: "Injection",
  perfusion: "Perfusion IV",
  cutanee: "Voie cutanee",
  autre: "Autre",
};

export const STATUT_ADMIN_LABELS: Record<AdministrationMedicament["statut"], string> = {
  administre: "Administre",
  refuse: "Refuse",
  reporte: "Reporte",
};

interface BackendAdministration {
  _id?: string;
  npi: string;
  consultation_id?: string | null;
  nom_medicament: string;
  dosage?: string | null;
  voie_administration?: string | null;
  statut?: string;
  notes?: string | null;
  administre_par?: string;
  horodatage: string;
}

const VOIES_VALIDES = new Set<AdministrationMedicament["voieAdministration"]>([
  "orale", "injectable", "perfusion", "cutanee", "autre",
]);
const STATUTS_VALIDES = new Set<AdministrationMedicament["statut"]>([
  "administre", "refuse", "reporte",
]);

function mapBackendAdministration(raw: BackendAdministration, index: number): AdministrationMedicament {
  const voie = raw.voie_administration as AdministrationMedicament["voieAdministration"];
  const statut = raw.statut as AdministrationMedicament["statut"];
  return {
    id: raw._id ?? `adm_${index}`,
    patientNpi: raw.npi,
    infirmierId: raw.administre_par ?? "",
    infirmier: raw.administre_par ?? "Professionnel de santé",
    etablissement: "",
    date: raw.horodatage,
    medicament: raw.nom_medicament,
    dosage: raw.dosage ?? "",
    voieAdministration: VOIES_VALIDES.has(voie) ? voie : "orale",
    statut: STATUTS_VALIDES.has(statut) ? statut : "administre",
    notes: raw.notes ?? undefined,
  };
}

export async function getAdministrationsByPatient(
  patientNpi: string
): Promise<AdministrationMedicament[]> {
  const raws = await apiFetch<BackendAdministration[]>(`/soins/administrations/patient/${patientNpi}`);
  return raws
    .map((r, i) => mapBackendAdministration(r, i))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Administrations du jour pour un patient — pour repérer, avant d'en
 * ajouter une nouvelle, ce qui a déjà été donné aujourd'hui (risque de
 * double dose entre équipes). */
export async function getTodayAdministrationsByPatient(patientNpi: string): Promise<AdministrationMedicament[]> {
  const toutes = await getAdministrationsByPatient(patientNpi);
  const aujourdHui = new Date().toDateString();
  return toutes.filter((a) => new Date(a.date).toDateString() === aujourdHui);
}

/** Historique complet des administrations validées par le professionnel connecté. */
export async function getAdministrationsByInfirmier(): Promise<AdministrationMedicament[]> {
  const raws = await apiFetch<BackendAdministration[]>("/soins/administrations/moi");
  return raws
    .map((r, i) => mapBackendAdministration(r, i))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getTodayAdministrationsByInfirmier(): Promise<AdministrationMedicament[]> {
  const toutes = await getAdministrationsByInfirmier();
  const aujourdHui = new Date().toDateString();
  return toutes.filter((a) => new Date(a.date).toDateString() === aujourdHui);
}

export async function createAdministration(
  payload: CreateAdministrationPayload,
  infirmierId: string,
  infirmierNom: string,
  etablissement: string
): Promise<AdministrationMedicament> {
  const body = {
    npi: payload.patientNpi,
    consultation_id: payload.consultationId,
    nom_medicament: payload.medicament,
    dosage: payload.dosage,
    voie_administration: payload.voieAdministration,
    statut: payload.statut,
    notes: payload.notes,
  };

  const result = await apiFetch<{ message: string; administration_id: string }>(
    "/soins/administrations",
    { method: "POST", body: JSON.stringify(body) }
  );

  return {
    id: result.administration_id,
    patientNpi: payload.patientNpi,
    infirmierId,
    infirmier: infirmierNom,
    etablissement,
    date: new Date().toISOString(),
    medicament: payload.medicament,
    dosage: payload.dosage,
    voieAdministration: payload.voieAdministration,
    statut: payload.statut,
    notes: payload.notes,
  };
}

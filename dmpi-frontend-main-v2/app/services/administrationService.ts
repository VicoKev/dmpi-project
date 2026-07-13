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
  consultation_id: string;
  nom_medicament: string;
  administre_par?: string;
  horodatage: string;
}

function mapBackendAdministration(raw: BackendAdministration, index: number): AdministrationMedicament {
  return {
    id: raw._id ?? `adm_${index}`,
    patientNpi: raw.npi,
    infirmierId: raw.administre_par ?? "",
    infirmier: raw.administre_par ?? "Professionnel de sante",
    etablissement: "",
    date: raw.horodatage,
    medicament: raw.nom_medicament,
    dosage: "",
    voieAdministration: "orale",
    statut: "administre",
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

export async function getAdministrationsByInfirmier(
  infirmierId: string
): Promise<AdministrationMedicament[]> {
  return [];
}

export async function getTodayAdministrationsByInfirmier(
  infirmierId: string
): Promise<AdministrationMedicament[]> {
  return [];
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
    nom_medicament: `${payload.medicament} ${payload.dosage}`.trim(),
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

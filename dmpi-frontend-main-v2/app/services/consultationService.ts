import type { Consultation, CreateConsultationPayload } from "../types/consultation";
import { apiFetch, apiFetchPagine, type ReponsePaginee } from "./api";



interface BackendConsultation {
  _id?: string;
  npi: string;
  motif: string;
  diagnostic_cim10: string;
  conclusion: string;
  created_at: string;
  releve_par?: string;
}

interface BackendCreateResponse {
  message: string;
  consultation_id: string;
  npi_patient: string;
}

function mapBackendConsultation(raw: BackendConsultation, index: number): Consultation {
  const cim10 = raw.diagnostic_cim10 ?? "";

  return {
    id: raw._id ?? `cons_${index}`,
    patientNpi: raw.npi,
    medecin: raw.releve_par ?? "Professionnel de sante",
    medecinId: raw.releve_par ?? "",
    etablissement: "",
    date: raw.created_at,
    motif: raw.motif,
    diagnosticPrincipal: cim10 ? { code: cim10, libelle: cim10 } : undefined,
    conclusion: raw.conclusion,
    statut: "signee",
  };
}

export async function getConsultationsByPatient(npi: string): Promise<Consultation[]> {
  const raws = await apiFetch<BackendConsultation[]>(`/consultations/patient/${npi}`);
  return raws
    .map((r, i) => mapBackendConsultation(r, i))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getConsultationById(id: string): Promise<Consultation | null> {
  return null;
}

export async function createConsultation(payload: CreateConsultationPayload): Promise<Consultation> {
  const cim10Code = payload.diagnosticPrincipal?.code ?? "";

  const body = {
    npi: payload.patientNpi,
    motif: payload.motif,
    diagnostic_cim10: cim10Code,
    conclusion: payload.conclusion ?? "",
  };

  const result = await apiFetch<BackendCreateResponse>("/consultations/", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    id: result.consultation_id,
    patientNpi: payload.patientNpi,
    medecin: "",
    medecinId: "",
    etablissement: "",
    date: new Date().toISOString(),
    motif: payload.motif,
    examenClinique: payload.examenClinique,
    constantes: payload.constantes,
    diagnosticPrincipal: payload.diagnosticPrincipal,
    diagnosticsSecondaires: payload.diagnosticsSecondaires,
    conclusion: payload.conclusion,
    conduiteATenir: payload.conduiteATenir,
    statut: "signee",
  };
}

export async function getTodayConsultations(medecinEmail: string): Promise<Consultation[]> {
  try {
    const consultations = await getConsultationsByMedecin(medecinEmail);
    const today = new Date().toISOString().split("T")[0];
    return consultations.filter((c) => c.date.startsWith(today));
  } catch {
    return [];
  }
}

export async function getConsultationsByMedecin(medecinEmail: string): Promise<Consultation[]> {
  try {
    const raws = await apiFetch<BackendConsultation[]>(`/consultations/medecin/${encodeURIComponent(medecinEmail)}`);
    return raws
      .map((r, i) => mapBackendConsultation(r, i))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export async function getConsultationsByMedecinPaginee(
  medecinEmail: string,
  skip: number,
  limit: number
): Promise<ReponsePaginee<Consultation>> {
  const { items, total } = await apiFetchPagine<BackendConsultation>(
    `/consultations/medecin/${encodeURIComponent(medecinEmail)}?skip=${skip}&limit=${limit}`
  );
  return {
    items: items
      .map((r, i) => mapBackendConsultation(r, i))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    total,
  };
}

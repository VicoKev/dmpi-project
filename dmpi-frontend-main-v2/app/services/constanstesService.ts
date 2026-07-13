import type { Constantes } from "../types/consultation";
import { apiFetch } from "./api";

export interface ReleveConstantes {
  id: string;
  patientNpi: string;
  infirmierId: string;
  infirmier: string;
  etablissement: string;
  date: string;
  constantes: Constantes;
  notes?: string;
}

export interface CreateRelevePayload {
  patientNpi: string;
  constantes: Constantes;
  notes?: string;
}

interface BackendConstantes {
  _id?: string;
  npi: string;
  tension_arterielle: string;
  pouls: number;
  temperature: number;
  saturation_oxygene?: number;
  notes?: string;
  releve_par?: string;
  created_at: string;
}

function parseTension(tensionStr: string): { sys?: number; dia?: number } {
  if (!tensionStr) return {};
  const parts = tensionStr.split("/");
  if (parts.length !== 2) return {};
  const sys = parseInt(parts[0]);
  const dia = parseInt(parts[1]);
  return {
    sys: isNaN(sys) ? undefined : sys,
    dia: isNaN(dia) ? undefined : dia,
  };
}

function buildTensionStr(constantes: Constantes): string {
  const sys = constantes.tensionSystolique ?? 0;
  const dia = constantes.tensionDiastolique ?? 0;
  return `${sys}/${dia}`;
}

function mapBackendReleve(raw: BackendConstantes, index: number): ReleveConstantes {
  const { sys, dia } = parseTension(raw.tension_arterielle);

  return {
    id: raw._id ?? `relv_${index}`,
    patientNpi: raw.npi,
    infirmierId: raw.releve_par ?? "",
    infirmier: raw.releve_par ?? "Professionnel de sante",
    etablissement: "",
    date: raw.created_at,
    constantes: {
      tensionSystolique: sys,
      tensionDiastolique: dia,
      pouls: raw.pouls,
      temperature: raw.temperature,
      saturationO2: raw.saturation_oxygene,
    },
    notes: raw.notes,
  };
}

export async function getRelevesByPatient(patientNpi: string): Promise<ReleveConstantes[]> {
  const raws = await apiFetch<BackendConstantes[]>(`/soins/constantes/patient/${patientNpi}`);
  return raws
    .map((r, i) => mapBackendReleve(r, i))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getRelevesByInfirmier(infirmierId: string): Promise<ReleveConstantes[]> {
  return [];
}

export async function getTodayRelevesByInfirmier(infirmierId: string): Promise<ReleveConstantes[]> {
  return [];
}

export async function createReleve(
  payload: CreateRelevePayload,
  infirmierId: string,
  infirmierNom: string,
  etablissement: string
): Promise<ReleveConstantes> {
  const body = {
    npi: payload.patientNpi,
    tension_arterielle: buildTensionStr(payload.constantes),
    pouls: payload.constantes.pouls ?? 0,
    temperature: payload.constantes.temperature ?? 37.0,
    saturation_oxygene: payload.constantes.saturationO2,
    notes: payload.notes,
  };

  const result = await apiFetch<{ message: string; constante_id: string; npi_patient: string }>(
    "/soins/constantes",
    { method: "POST", body: JSON.stringify(body) }
  );

  return {
    id: result.constante_id,
    patientNpi: payload.patientNpi,
    infirmierId,
    infirmier: infirmierNom,
    etablissement,
    date: new Date().toISOString(),
    constantes: payload.constantes,
    notes: payload.notes,
  };
}

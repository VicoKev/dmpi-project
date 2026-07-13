import type {
  DossierPatient,
  Patient,
  PatientSearchResult,
  Allergie,
  Antecedent,
  Traitement,
} from "../types/patient";
import { apiFetch } from "./api";

interface BackendAllergie {
  substance: string;
  severite: string;
  notes?: string;
}

interface BackendTraitement {
  nom_medicament: string;
  posologie: string;
  indication?: string;
}

interface BackendDossier {
  npi: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  sexe?: string;
  groupe_sanguin?: string;
  allergies: BackendAllergie[];
  antecedents: string[];
  traitements_en_cours: BackendTraitement[];
  updated_at: string;
  _id?: string;
}

function mapAllergie(a: BackendAllergie, index: number): Allergie {
  return {
    id: `alg_${index}`,
    substance: a.substance,
    type: "medicament",
    severite: (["legere", "moderee", "severe", "anaphylaxie"].includes(a.severite)
      ? a.severite
      : "moderee") as Allergie["severite"],
    reaction: a.notes,
  };
}

function mapAntecedent(desc: string, index: number): Antecedent {
  return {
    id: `ant_${index}`,
    type: "medical",
    description: desc,
  };
}

function mapTraitement(t: BackendTraitement, index: number): Traitement {
  return {
    id: `trt_${index}`,
    medicament: t.nom_medicament,
    dosage: t.posologie,
    frequence: t.indication ?? "Selon prescription",
    dateDebut: new Date().toISOString().split("T")[0],
    actif: true,
  };
}

function mapDossierToPatient(dossier: BackendDossier): Patient {
  return {
    npi: dossier.npi,
    nom: dossier.nom || "Patient",
    prenom: dossier.prenom || "",
    dateNaissance: dossier.date_naissance || "",
    sexe: (dossier.sexe as "M" | "F" | "Autre") || "M",
    groupeSanguin: (dossier.groupe_sanguin as Patient["groupeSanguin"]) ?? null,
  };
}

function mapBackendDossier(raw: BackendDossier): DossierPatient {
  return {
    patient: mapDossierToPatient(raw),
    contactsUrgence: [],
    allergies: raw.allergies.map(mapAllergie),
    antecedents: raw.antecedents.map(mapAntecedent),
    traitementsEnCours: raw.traitements_en_cours.map(mapTraitement),
    vaccinations: [],
    hospitalisations: [],
    examens: [],
    derniereMaj: raw.updated_at,
  };
}

export function validateNpi(npi: string): boolean {
  return /^\d{10}$/.test(npi.trim());
}

export async function getPatientByNpi(npi: string): Promise<PatientSearchResult | null> {
  try {
    const raw = await apiFetch<BackendDossier>(`/dossiers/${npi.trim()}`);
    if (!raw) return null;

    const dossier = mapBackendDossier(raw);
    return {
      npi: raw.npi,
      nom: dossier.patient.nom,
      prenom: dossier.patient.prenom,
      dateNaissance: dossier.patient.dateNaissance,
      sexe: dossier.patient.sexe,
      groupeSanguin: raw.groupe_sanguin,
      allergiesCount: raw.allergies.length,
      dernierEtablissement: undefined,
      derniereVisite: raw.updated_at,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("404")) return null;
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404") || message.toLowerCase().includes("introuvable")) return null;
    throw err;
  }
}

export async function getDossierPatient(npi: string): Promise<DossierPatient | null> {
  try {
    const raw = await apiFetch<BackendDossier>(`/dossiers/${npi.trim()}`);
    if (!raw) return null;
    return mapBackendDossier(raw);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404") || message.toLowerCase().includes("introuvable")) return null;
    throw err;
  }
}

export interface UpdateDossierPayload {
  npi: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string | null;
  sexe?: string | null;
  groupe_sanguin?: string | null;
  allergies?: { substance: string; severite: string; notes?: string }[];
  antecedents?: string[];
  traitements_en_cours?: { nom_medicament: string; posologie: string; indication?: string }[];
}

export async function updateDossierPatient(npi: string, payload: UpdateDossierPayload): Promise<DossierPatient | null> {
  try {
    const raw = await apiFetch<BackendDossier>(`/dossiers/${npi.trim()}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!raw) return null;
    return mapBackendDossier(raw);
  } catch (err: unknown) {
    throw err;
  }
}

export function calculerAge(dateNaissance: string): number | "-" {
  if (!dateNaissance) return "-";
  const naissance = new Date(dateNaissance);
  const aujourd_hui = new Date();
  let age = aujourd_hui.getFullYear() - naissance.getFullYear();
  const moisDiff = aujourd_hui.getMonth() - naissance.getMonth();
  if (moisDiff < 0 || (moisDiff === 0 && aujourd_hui.getDate() < naissance.getDate())) {
    age--;
  }
  return age;
}

export function formatDateFr(dateIso: string): string {
  if (!dateIso) return "";
  return new Date(dateIso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

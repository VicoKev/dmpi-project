import type { Prescription, CreatePrescriptionPayload } from "../types/prescription";
import { apiFetch } from "./api";

interface BackendMedicament {
  nom_medicament: string;
  posologie: string;
  duree: string;
}

interface BackendOrdonnance {
  _id?: string;
  npi: string;
  consultation_id?: string;
  traitements: BackendMedicament[];
  notes_additionnelles?: string;
  created_at: string;
  auteur?: string;
}

function mapOrdonnance(
  ordo: BackendOrdonnance,
  index: number
): Prescription | null {
  if (!ordo || !ordo.traitements || ordo.traitements.length === 0) return null;

  return {
    id: `pres_${ordo._id ?? index}`,
    consultationId: ordo.consultation_id ?? "",
    patientNpi: ordo.npi,
    prescripteur: ordo.auteur ?? "Professionnel de sante",
    prescripteurId: ordo.auteur ?? "",
    etablissement: "",
    date: ordo.created_at,
    lignes: ordo.traitements.map((m, i) => ({
      id: `lig_${index}_${i}`,
      medicament: m.nom_medicament,
      dosage: m.posologie,
      forme: "Comprime",
      posologie: m.posologie,
      frequence: "autre" as const,
      dureeJours: parseInt(m.duree) || 0,
      renouvelable: false,
      instructions: m.duree,
    })),
    noteGlobale: ordo.notes_additionnelles,
    statut: "signee",
    signee: true,
  };
}

export async function getPrescriptionsByPatient(npi: string): Promise<Prescription[]> {
  const ordonnances = await apiFetch<BackendOrdonnance[]>(
    `/ordonnances/patient/${npi}`
  );

  return ordonnances
    .map((o, i) => mapOrdonnance(o, i))
    .filter((p): p is Prescription => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
  return null;
}

export async function getPrescriptionsByPrescripteur(prescripteurEmail: string): Promise<Prescription[]> {
  try {
    const ordonnances = await apiFetch<BackendOrdonnance[]>(
      `/ordonnances/medecin/${encodeURIComponent(prescripteurEmail)}`
    );

    return ordonnances
      .map((o, i) => mapOrdonnance(o, i))
      .filter((p): p is Prescription => p !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

export async function createPrescription(payload: CreatePrescriptionPayload): Promise<Prescription> {
  const body = {
    npi: payload.patientNpi,
    consultation_id: payload.consultationId || null,
    traitements: payload.lignes.map((l) => ({
      nom_medicament: `${l.medicament} ${l.dosage}`,
      posologie: l.posologie,
      duree: `${l.dureeJours} jours`,
    })),
    notes_additionnelles: payload.noteGlobale,
  };

  const result = await apiFetch<{ message: string; ordonnance_id: string; npi_patient: string }>(
    "/ordonnances/",
    { method: "POST", body: JSON.stringify(body) }
  );

  return {
    id: `pres_${result.ordonnance_id}`,
    consultationId: payload.consultationId || "",
    patientNpi: payload.patientNpi,
    prescripteur: "",
    prescripteurId: "",
    etablissement: "",
    date: new Date().toISOString(),
    lignes: payload.lignes.map((l, i) => ({
      ...l,
      id: `lig_${Date.now()}_${i}`,
    })),
    noteGlobale: payload.noteGlobale,
    statut: "signee",
    signee: true,
  };
}

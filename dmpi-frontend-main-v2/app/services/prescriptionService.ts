import type { Prescription, CreatePrescriptionPayload } from "../types/prescription";
import { apiFetch } from "./api";

interface BackendMedicament {
  nom_medicament: string;
  posologie: string;
  duree: string;
  renouvelable: boolean;
}

interface BackendOrdonnance {
  id: string;
  npi: string;
  consultation_id?: string;
  traitements: BackendMedicament[];
  notes_additionnelles?: string;
  created_at: string;
  auteur?: string;
  etablissement_nom?: string | null;
  renouvelee_depuis?: string | null;
}

function mapOrdonnance(
  ordo: BackendOrdonnance,
  index: number
): Prescription | null {
  if (!ordo || !ordo.traitements || ordo.traitements.length === 0) return null;

  return {
    id: `pres_${ordo.id ?? index}`,
    consultationId: ordo.consultation_id ?? "",
    patientNpi: ordo.npi,
    prescripteur: ordo.auteur ?? "Professionnel de sante",
    prescripteurId: ordo.auteur ?? "",
    etablissement: ordo.etablissement_nom ?? "",
    date: ordo.created_at,
    renouveleeDepuis: ordo.renouvelee_depuis ?? null,
    lignes: ordo.traitements.map((m, i) => ({
      id: `lig_${index}_${i}`,
      medicament: m.nom_medicament,
      dosage: m.posologie,
      forme: "Comprime",
      posologie: m.posologie,
      frequence: "autre" as const,
      dureeJours: parseInt(m.duree) || 0,
      renouvelable: m.renouvelable,
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
      renouvelable: l.renouvelable,
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

/** Retrouve l'identifiant Mongo brut d'une ordonnance à partir de l'id
 * "pres_<id>" utilisé côté frontend (voir mapOrdonnance/createPrescription). */
export function ordonnanceIdDepuisPrescriptionId(prescriptionId: string): string {
  return prescriptionId.replace(/^pres_/, "");
}

/**
 * Renouvelle une ordonnance : crée une nouvelle ordonnance ne reprenant que
 * les médicaments marqués "renouvelable" sur l'originale, sans nouvelle
 * consultation. Réservé aux médecins.
 */
export async function renouvelerPrescription(prescriptionId: string): Promise<{ ordonnanceId: string; message: string }> {
  const ordonnanceId = ordonnanceIdDepuisPrescriptionId(prescriptionId);
  const result = await apiFetch<{ message: string; ordonnance_id: string; npi_patient: string }>(
    `/ordonnances/${ordonnanceId}/renouveler`,
    { method: "POST" }
  );
  return { ordonnanceId: result.ordonnance_id, message: result.message };
}

export interface PharmacieProche {
  id: string;
  nom: string;
  adresse: string | null;
  commune: string | null;
  latitude: number;
  longitude: number;
  telephone: string;
  horaires: string | null;
  distance_km: number;
  derniere_verification: string | null;
}

export interface ReferenceLocalisation {
  latitude: number;
  longitude: number;
  source: "etablissement_prescripteur" | "position_utilisateur";
}

export interface PharmaciesProchesResponse {
  reference: ReferenceLocalisation | null;
  pharmacies: PharmacieProche[];
}

export async function getPharmaciesProches(
  prescriptionId: string,
  position?: { latitude: number; longitude: number }
): Promise<PharmaciesProchesResponse> {
  const ordonnanceId = ordonnanceIdDepuisPrescriptionId(prescriptionId);
  const params = new URLSearchParams();
  if (position) {
    params.set("latitude", String(position.latitude));
    params.set("longitude", String(position.longitude));
  }
  const qs = params.toString();
  return apiFetch<PharmaciesProchesResponse>(
    `/ordonnances/${ordonnanceId}/pharmacies-proches${qs ? `?${qs}` : ""}`
  );
}

import type {
  DossierPatient,
  Patient,
  PatientSearchResult,
  Allergie,
  Antecedent,
  Traitement,
  Vaccination,
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
  actif?: boolean;
  date_arret?: string | null;
  motif_arret?: string | null;
  ordonnance_id?: string | null;
  ligne_index?: number | null;
}

interface BackendTuteur {
  nom: string;
  telephone: string;
  lien_parente: string;
}

interface BackendVaccination {
  nom_vaccin: string;
  date_administration: string;
  dose?: string | null;
  lot?: string | null;
  prochaine_dose_prevue?: string | null;
  notes?: string | null;
  administre_par?: string | null;
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
  vaccinations?: BackendVaccination[];
  tuteur?: BackendTuteur | null;
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
    index,
    medicament: t.nom_medicament,
    dosage: t.posologie,
    frequence: t.indication ?? "Selon prescription",
    dateDebut: new Date().toISOString().split("T")[0],
    dateFin: t.date_arret ?? undefined,
    motifArret: t.motif_arret ?? undefined,
    actif: t.actif ?? true,
    ordonnanceId: t.ordonnance_id ?? undefined,
    ligneIndex: t.ligne_index ?? undefined,
  };
}

function mapVaccination(v: BackendVaccination): Vaccination {
  return {
    nomVaccin: v.nom_vaccin,
    dateAdministration: v.date_administration,
    dose: v.dose ?? undefined,
    lot: v.lot ?? undefined,
    prochaineDosePrevue: v.prochaine_dose_prevue ?? undefined,
    notes: v.notes ?? undefined,
    administrePar: v.administre_par ?? undefined,
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
    vaccinations: (raw.vaccinations ?? []).map(mapVaccination),
    hospitalisations: [],
    examens: [],
    tuteur: raw.tuteur
      ? { nom: raw.tuteur.nom, telephone: raw.tuteur.telephone, lienParente: raw.tuteur.lien_parente }
      : null,
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

/** Arrête un traitement en cours — réservé au médecin. Le traitement reste
 * visible dans l'historique du dossier, seulement marqué inactif. */
export async function arreterTraitement(npi: string, index: number, motif?: string): Promise<DossierPatient | null> {
  const raw = await apiFetch<BackendDossier>(`/dossiers/${npi.trim()}/traitements/${index}/arreter`, {
    method: "PATCH",
    body: JSON.stringify({ motif: motif?.trim() || undefined }),
  });
  if (!raw) return null;
  return mapBackendDossier(raw);
}

export interface CreateDossierPayload {
  npi: string;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  sexe?: string | null;
  groupe_sanguin?: string | null;
  tuteur?: { nom: string; telephone: string; lien_parente: string } | null;
}

export async function createDossierPatient(payload: CreateDossierPayload): Promise<void> {
  await apiFetch("/dossiers/", {
    method: "POST",
    // updated_at est recalculé côté serveur, mais le champ est requis par le schéma d'entrée.
    body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }),
  });
}

export interface AjouterVaccinationPayload {
  nom_vaccin: string;
  date_administration: string;
  dose?: string;
  lot?: string;
  prochaine_dose_prevue?: string;
  notes?: string;
}

/** Ajoute une entrée au carnet de vaccination — journal historique, jamais modifié ni supprimé après coup. */
export async function ajouterVaccination(npi: string, payload: AjouterVaccinationPayload): Promise<DossierPatient | null> {
  const raw = await apiFetch<BackendDossier>(`/dossiers/${npi.trim()}/vaccinations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!raw) return null;
  return mapBackendDossier(raw);
}

export interface RechercheDossierResultat {
  npi: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  sexe?: string;
}

/** Retrouve le NPI d'un patient par nom/prénom/date de naissance — au moins un critère requis.
 * Ne renvoie qu'une vue d'identification, jamais de données cliniques. */
export async function rechercherPatientsParNom(criteres: { nom?: string; prenom?: string; dateNaissance?: string }): Promise<RechercheDossierResultat[]> {
  const params = new URLSearchParams();
  if (criteres.nom?.trim()) params.set("nom", criteres.nom.trim());
  if (criteres.prenom?.trim()) params.set("prenom", criteres.prenom.trim());
  if (criteres.dateNaissance) params.set("date_naissance", criteres.dateNaissance);
  return apiFetch<RechercheDossierResultat[]>(`/dossiers/recherche/patients?${params.toString()}`);
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

// Types ordonnance — DMPI Frontend

export type FrequenceMedicament =
  | "matin_midi_soir"
  | "matin_soir"
  | "une_fois_par_jour"
  | "si_besoin"
  | "toutes_les_8h"
  | "toutes_les_12h"
  | "hebdomadaire"
  | "autre";

export const FREQUENCE_LABELS: Record<FrequenceMedicament, string> = {
  matin_midi_soir: "Matin, Midi, Soir",
  matin_soir: "Matin et Soir",
  une_fois_par_jour: "Une fois par jour",
  si_besoin: "Si besoin (PRN)",
  toutes_les_8h: "Toutes les 8 heures",
  toutes_les_12h: "Toutes les 12 heures",
  hebdomadaire: "Hebdomadaire",
  autre: "Autre",
};

export interface LigneMedicament {
  id: string;
  medicament: string;
  dosage: string;
  forme?: string; // comprimé, gélule, sirop...
  posologie: string;
  frequence: FrequenceMedicament;
  dureeJours?: number;
  renouvelable: boolean;
  instructions?: string; // "À prendre au cours des repas"
}

export interface Prescription {
  id: string;
  consultationId?: string;
  patientNpi: string;
  prescripteur: string;
  prescripteurId: string;
  etablissement: string;
  date: string; // ISO 8601
  dateExpiration?: string;
  /** ID de l'ordonnance d'origine si celle-ci a été créée par renouvellement */
  renouveleeDepuis?: string | null;
  lignes: LigneMedicament[];
  noteGlobale?: string;
  statut: "brouillon" | "signee" | "dispensee" | "expiree";
  /** Si true, une signature électronique a été apposée */
  signee: boolean;
  /** URL du PDF généré */
  pdfUrl?: string;
}

export interface CreatePrescriptionPayload {
  consultationId?: string;
  patientNpi: string;
  lignes: Omit<LigneMedicament, "id">[];
  noteGlobale?: string;
}

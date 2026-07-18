// Types patient & dossier médical — DMPI Frontend

export interface Patient {
  npi: string; // 10 chiffres — identifiant unique national
  nom: string;
  prenom: string;
  dateNaissance: string; // ISO 8601
  sexe: "M" | "F" | "Autre";
  groupeSanguin: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | null;
  avatarUrl?: string;
  telephone?: string;
  adresse?: string;
  commune?: string;
  departement?: string;
  nationalite?: string;
  numeroAssurance?: string;
}

export interface ContactUrgence {
  nom: string;
  prenom: string;
  lienParente: string;
  telephone: string;
}

export interface Allergie {
  id: string;
  substance: string;
  type: "medicament" | "alimentaire" | "environnementale" | "autre";
  severite: "legere" | "moderee" | "severe" | "anaphylaxie";
  reaction?: string;
  dateDecouverte?: string;
}

export interface Antecedent {
  id: string;
  type: "medical" | "chirurgical" | "familial" | "obstetrical";
  description: string;
  annee?: number;
  cim10Code?: string;
}

export interface Traitement {
  id: string;
  /** Position dans le tableau traitements_en_cours côté backend — nécessaire pour cibler l'arrêt d'un traitement précis. */
  index: number;
  medicament: string;
  dosage: string;
  frequence: string;
  duree?: string;
  dateDebut: string;
  dateFin?: string;
  motifArret?: string;
  prescripteur?: string;
  actif: boolean;
  /** Lien précis vers la ligne d'ordonnance à l'origine de cette entrée — absent sur les traitements créés avant ce champ. */
  ordonnanceId?: string;
  ligneIndex?: number;
}

export interface Hospitalisation {
  id: string;
  motif: string;
  etablissement: string;
  dateEntree: string;
  dateSortie?: string;
  serviceHospitalier?: string;
  diagnosticPrincipal?: string;
  compteRendu?: string;
}

export interface ResultatExamen {
  id: string;
  type: "biologie" | "imagerie" | "ecg" | "anatomopathologie" | "autre";
  libelle: string;
  date: string;
  prescripteur?: string;
  laboratoire?: string;
  statut: "en_attente" | "disponible" | "urgent";
  valeurs?: ExamenValeur[];
  rapportUrl?: string;
  commentaire?: string;
}

export interface ExamenValeur {
  parametre: string;
  valeur: string | number;
  unite?: string;
  valeurNormale?: string;
  anormal?: boolean;
}

export interface Tuteur {
  nom: string;
  telephone: string;
  lienParente: string;
}

export interface DossierPatient {
  patient: Patient;
  contactsUrgence: ContactUrgence[];
  allergies: Allergie[];
  antecedents: Antecedent[];
  traitementsEnCours: Traitement[];
  hospitalisations: Hospitalisation[];
  examens: ResultatExamen[];
  /** Tuteur / parent — pour mineurs et nouveau-nés sans contact propre */
  tuteur?: Tuteur | null;
  /** Dernière mise à jour du dossier */
  derniereMaj: string;
  /** Établissement ayant créé le dossier */
  etablissementCreateur?: string;
}

/** Résultat de recherche patient (vue allégée) */
export interface PatientSearchResult {
  npi: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: "M" | "F" | "Autre";
  avatarUrl?: string;
  groupeSanguin?: string;
  allergiesCount: number;
  dernierEtablissement?: string;
  derniereVisite?: string;
}

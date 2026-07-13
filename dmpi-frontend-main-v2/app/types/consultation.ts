// Types consultation — DMPI Frontend

export interface Cim10Code {
  code: string;   // Ex: "E11", "J06.9"
  libelle: string; // Ex: "Diabète sucré de type 2"
  chapitre?: string;
}

export interface Constantes {
  tensionSystolique?: number;  // mmHg
  tensionDiastolique?: number; // mmHg
  pouls?: number;              // bpm
  temperature?: number;        // °C
  poids?: number;              // kg
  taille?: number;             // cm
  saturationO2?: number;       // %
  glycemie?: number;           // g/L
  frequenceRespiratoire?: number; // /min
}

export interface Consultation {
  id: string;
  patientNpi: string;
  medecin: string;
  medecinId: string;
  etablissement: string;
  date: string;     // ISO 8601
  motif: string;
  examenClinique?: string;
  constantes?: Constantes;
  diagnosticPrincipal?: Cim10Code;
  diagnosticsSecondaires?: Cim10Code[];
  conclusion?: string;
  conduiteATenir?: string;
  prescriptionId?: string; // ID ordonnance liée
  examensDemandesIds?: string[];
  statut: "brouillon" | "validee" | "signee";
  /** Compte-rendu PDF URL si généré */
  compteRenduUrl?: string;
}

export interface CreateConsultationPayload {
  patientNpi: string;
  motif: string;
  examenClinique?: string;
  constantes?: Constantes;
  diagnosticPrincipal?: Cim10Code;
  diagnosticsSecondaires?: Cim10Code[];
  conclusion?: string;
  conduiteATenir?: string;
}

export interface UpdateConsultationPayload extends Partial<CreateConsultationPayload> {
  statut?: "brouillon" | "validee" | "signee";
}

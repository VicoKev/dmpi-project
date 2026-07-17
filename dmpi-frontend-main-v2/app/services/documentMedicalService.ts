import { apiFetch, apiUpload, apiFetchBlobUrl, apiDownload } from "./api";

export type TypeDocumentMedical =
  | "radiographie" | "scanner" | "echographie" | "irm"
  | "biologie" | "anatomopathologie" | "ecg" | "autre";

export const TYPE_DOCUMENT_LABELS: Record<TypeDocumentMedical, string> = {
  radiographie: "Radiographie",
  scanner: "Scanner",
  echographie: "Échographie",
  irm: "IRM",
  biologie: "Analyse de laboratoire",
  anatomopathologie: "Anatomopathologie",
  ecg: "ECG",
  autre: "Autre",
};

export interface FichierMedical {
  id: string;
  nom_original: string;
  type_mime: string;
  taille_octets: number;
  a_une_vignette: boolean;
}

export interface DocumentMedical {
  id: string;
  npi: string;
  demande_examen_id: string | null;
  type: TypeDocumentMedical;
  libelle: string;
  date_realisation: string;
  laboratoire_nom: string | null;
  prestataire_id: string | null;
  uploade_par_email: string;
  uploade_par_role: "medecin" | "laboratoire";
  commentaire: string | null;
  interpretation_medecin: string | null;
  interpretation_par_email: string | null;
  fichiers: FichierMedical[];
  statut: "disponible" | "archive";
  created_at: string;
  updated_at: string | null;
}

export interface UploaderDocumentPayload {
  npi: string;
  demande_examen_id?: string | null;
  type: TypeDocumentMedical;
  libelle: string;
  date_realisation: string; // AAAA-MM-JJ
  laboratoire_nom?: string | null;
  commentaire?: string | null;
  fichiers: File[];
}

export async function uploaderDocument(payload: UploaderDocumentPayload): Promise<DocumentMedical> {
  const formData = new FormData();
  formData.append("npi", payload.npi);
  if (payload.demande_examen_id) formData.append("demande_examen_id", payload.demande_examen_id);
  formData.append("type", payload.type);
  formData.append("libelle", payload.libelle);
  formData.append("date_realisation", payload.date_realisation);
  if (payload.laboratoire_nom) formData.append("laboratoire_nom", payload.laboratoire_nom);
  if (payload.commentaire) formData.append("commentaire", payload.commentaire);
  for (const fichier of payload.fichiers) {
    formData.append("fichiers", fichier);
  }
  return apiUpload<DocumentMedical>("/documents-medicaux/", formData);
}

export interface ModifierDocumentPayload {
  type?: TypeDocumentMedical;
  libelle?: string;
  date_realisation?: string;
  commentaire?: string | null;
  /** Si fourni, remplace intégralement les fichiers existants. */
  fichiers?: File[];
}

export async function modifierDocument(documentId: string, payload: ModifierDocumentPayload): Promise<DocumentMedical> {
  const formData = new FormData();
  if (payload.type) formData.append("type", payload.type);
  if (payload.libelle !== undefined) formData.append("libelle", payload.libelle);
  if (payload.date_realisation) formData.append("date_realisation", payload.date_realisation);
  if (payload.commentaire !== undefined && payload.commentaire !== null) formData.append("commentaire", payload.commentaire);
  if (payload.fichiers) {
    for (const fichier of payload.fichiers) {
      formData.append("fichiers", fichier);
    }
  }
  return apiUpload<DocumentMedical>(`/documents-medicaux/${documentId}`, formData, "PATCH");
}

export async function definirInterpretation(documentId: string, interpretation: string): Promise<DocumentMedical> {
  return apiFetch<DocumentMedical>(`/documents-medicaux/${documentId}/interpretation`, {
    method: "PATCH",
    body: JSON.stringify({ interpretation_medecin: interpretation }),
  });
}

export async function getDocumentsPatient(npi: string): Promise<DocumentMedical[]> {
  return apiFetch<DocumentMedical[]>(`/documents-medicaux/patient/${npi}`);
}

export async function archiverDocument(documentId: string): Promise<void> {
  return apiFetch<void>(`/documents-medicaux/${documentId}`, { method: "DELETE" });
}

export function obtenirUrlFichier(documentId: string, fichierId: string, vignette = false): Promise<string> {
  const qs = vignette ? "?vignette=true" : "";
  return apiFetchBlobUrl(`/documents-medicaux/${documentId}/fichier/${fichierId}${qs}`);
}

export function telechargerFichier(documentId: string, fichier: FichierMedical): Promise<void> {
  return apiDownload(`/documents-medicaux/${documentId}/fichier/${fichier.id}`, fichier.nom_original);
}

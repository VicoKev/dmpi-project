import { apiFetchPagine, type ReponsePaginee } from "./api";

export interface AuditEntry {
  id: number;
  utilisateur_email: string;
  utilisateur_nom_complet?: string;
  utilisateur_role?: string;
  action: string;
  npi_concerne?: string;
  statut_action: string;
  horodatage: string;
  adresse_ip?: string;
}

export interface FiltresAudit {
  statutAction?: string;
}

export async function getJournalAudit(
  skip: number,
  limit: number,
  filtres: FiltresAudit = {}
): Promise<ReponsePaginee<AuditEntry>> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
  if (filtres.statutAction) params.set("statut_action", filtres.statutAction);
  return apiFetchPagine<AuditEntry>(`/admin/logs?${params.toString()}`);
}

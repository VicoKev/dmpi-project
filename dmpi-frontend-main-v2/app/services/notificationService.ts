import { apiFetch } from "./api";

export interface ElementNotification {
  cle: string;
  titre: string;
  compte: number;
  lien: string;
  icone: string;
  urgence: "info" | "warning" | "error";
}

export interface NotificationsResponse {
  total: number;
  elements: ElementNotification[];
}

/** Éléments actuellement en attente d'action pour l'utilisateur connecté — pas de
 * budget pour un vrai canal SMS/email, donc agrégation en direct plutôt qu'un flux
 * d'événements poussés. */
export async function getMesNotifications(): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>("/notifications/moi");
}

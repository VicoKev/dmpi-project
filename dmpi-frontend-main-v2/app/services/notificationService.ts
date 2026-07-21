import { apiFetch } from "./api";

export interface ElementNotification {
  cle: string;
  titre: string;
  compte: number;
  lien: string;
  icone: string;
  urgence: "info" | "warning" | "error";
  /** Vrai uniquement pour les notifications purement informatives — les
   * autres signalent une action encore non faite et ne peuvent pas être
   * masquées manuellement, seulement résolues. */
  peut_marquer_vu: boolean;
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

/** Masque une notification informative (voir peut_marquer_vu) — sans effet
 * sur les autres, qui ne disparaissent qu'en résolvant réellement leur cause. */
export async function marquerNotificationVue(cle: string): Promise<void> {
  await apiFetch("/notifications/marquer-vu", {
    method: "POST",
    body: JSON.stringify({ cle }),
  });
}

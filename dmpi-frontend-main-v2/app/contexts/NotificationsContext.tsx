// Cloche de notifications — agrège en direct ce qui est "en attente" pour
// l'utilisateur connecté (pas de budget pour un vrai canal SMS/email).
// Un seul point de récupération partagé par la Sidebar (badges par lien) et
// la cloche (panneau détaillé), pour éviter d'interroger deux fois l'API.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getMesNotifications, type ElementNotification } from "../services/notificationService";

const REFRESH_MS = 30_000;

interface NotificationsContextValue {
  elements: ElementNotification[];
  total: number;
  loading: boolean;
  rafraichir: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [elements, setElements] = useState<ElementNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const charger = useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getMesNotifications()
      .then((r) => {
        setElements(r.elements);
        setTotal(r.total);
      })
      .catch(() => {
        // Une erreur de récupération des notifications ne doit jamais bloquer l'app —
        // on garde silencieusement le dernier état connu.
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setElements([]);
      setTotal(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    charger();
    intervalRef.current = setInterval(charger, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, charger]);

  return (
    <NotificationsContext.Provider value={{ elements, total, loading, rafraichir: charger }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications doit être utilisé à l'intérieur de <NotificationsProvider>.");
  }
  return ctx;
}

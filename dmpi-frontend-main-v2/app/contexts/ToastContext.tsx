// Fournit une alternative à window.alert() — un bandeau de notification
// éphémère cohérent avec le design system, plutôt que l'alerte native du navigateur.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import Toast, { type ToastData } from "../components/ui/Toast";

type ShowToast = (message: string, type?: ToastData["type"]) => void;

const ToastContext = createContext<ShowToast | null>(null);

const DUREE_AFFICHAGE_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback<ShowToast>((message, type = "success") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type });
    timeoutRef.current = setTimeout(() => setToast(null), DUREE_AFFICHAGE_MS);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toast toast={toast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast doit être utilisé à l'intérieur de <ToastProvider>.");
  }
  return ctx;
}

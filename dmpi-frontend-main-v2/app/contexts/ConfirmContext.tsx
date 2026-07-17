// Fournit une alternative à window.confirm() basée sur une Promise, rendue
// via la boîte de dialogue du design system plutôt que l'alerte native du navigateur.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import ConfirmDialog, { type ConfirmDialogOptions } from "../components/ui/ConfirmDialog";

type AskConfirmation = (options: ConfirmDialogOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<AskConfirmation | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const askConfirmation = useCallback<AskConfirmation>((opts) => {
    setOptions(typeof opts === "string" ? { message: opts } : opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setOptions(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={askConfirmation}>
      {children}
      <ConfirmDialog
        open={options !== null}
        title={options?.title}
        message={options?.message ?? ""}
        confirmLabel={options?.confirmLabel}
        cancelLabel={options?.cancelLabel}
        variant={options?.variant}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): AskConfirmation {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm doit être utilisé à l'intérieur de <ConfirmProvider>.");
  }
  return ctx;
}

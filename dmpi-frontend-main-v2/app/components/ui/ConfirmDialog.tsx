// Composant ConfirmDialog — Design system DMPI
// Remplace window.confirm() par une boîte de dialogue cohérente avec le reste de l'interface.
import Button from "./Button";

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

interface ConfirmDialogProps extends ConfirmDialogOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-sm rounded-2xl p-6 shadow-xl animate-zoom-in"
        style={{ backgroundColor: "var(--color-surface-container-lowest)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
            style={
              variant === "danger"
                ? { backgroundColor: "var(--color-error-container)", color: "var(--color-error)" }
                : { backgroundColor: "var(--color-primary-container)", color: "var(--color-primary)" }
            }
          >
            <span className="material-symbols-outlined filled text-[20px]">
              {variant === "danger" ? "warning" : "help"}
            </span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {title && (
              <h3 id="confirm-dialog-title" className="text-subheading" style={{ color: "var(--color-on-surface)" }}>
                {title}
              </h3>
            )}
            <p
              id="confirm-dialog-message"
              className="text-body-md mt-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

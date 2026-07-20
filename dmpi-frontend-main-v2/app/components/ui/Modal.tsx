// Modal — socle partagé pour toutes les fenêtres modales de l'app.
// Sans lui, chaque écran réinventait sa propre fenêtre (fond, fermeture,
// accessibilité) : aucune ne se fermait au clavier (Échap), et les lecteurs
// d'écran n'avaient aucun moyen de savoir qu'une boîte de dialogue s'était ouverte.
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  /** Classe Tailwind de largeur max, ex. "max-w-md" (défaut), "max-w-3xl". */
  maxWidth?: string;
  labelledBy?: string;
  /** Désactive la fermeture au clic sur le fond — utile en cours d'étape
   * bloquante (ex. import en cours) où une fermeture accidentelle ferait perdre la saisie. */
  closeOnBackdrop?: boolean;
  className?: string;
}

export default function Modal({
  onClose,
  children,
  maxWidth = "max-w-md",
  labelledBy,
  closeOnBackdrop = true,
  className,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`w-full ${maxWidth} rounded-3xl p-6 shadow-2xl animate-slide-down ${className ?? ""}`}
        style={{ backgroundColor: "var(--color-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  icon: string;
  title: string;
  titleId?: string;
  subtitle?: string;
  onClose: () => void;
}

/** En-tête icône + titre + bouton de fermeture — répété à l'identique dans
 * la quasi-totalité des modales de formulaire de l'app. */
export function ModalHeader({ icon, title, titleId, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--color-primary-container)" }}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-primary-container)" }}>
            {icon}
          </span>
        </div>
        <div>
          <h2 id={titleId} className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container)]"
      >
        <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-surface)" }}>close</span>
      </button>
    </div>
  );
}

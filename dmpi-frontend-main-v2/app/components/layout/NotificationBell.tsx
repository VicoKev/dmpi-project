// Cloche de notifications — agrège ce qui est en attente d'action pour
// l'utilisateur connecté, tous rôles confondus, sans dépendre d'un canal
// SMS/email (pas de budget pour ça pour le moment).
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useNotifications } from "../../contexts/NotificationsContext";
import { marquerNotificationVue, type ElementNotification } from "../../services/notificationService";

const PLAFOND_AFFICHAGE = 99;

const COULEURS_URGENCE: Record<ElementNotification["urgence"], { bg: string; color: string }> = {
  info: { bg: "var(--color-primary-container)", color: "var(--color-on-primary-container)" },
  warning: { bg: "var(--color-warning-container)", color: "var(--color-on-warning-container)" },
  error: { bg: "var(--color-error-container)", color: "var(--color-on-error-container)" },
};

interface NotificationBellProps {
  /** Côté vers lequel le panneau s'ouvre, pour rester à l'écran quel que
   * soit l'endroit où la cloche est placée : "right" (par défaut) quand
   * elle est près du bord droit (TopBar mobile), "left" quand elle est
   * près du bord gauche (en-tête de la Sidebar desktop). */
  align?: "left" | "right";
}

export default function NotificationBell({ align = "right" }: NotificationBellProps) {
  const { elements, total, rafraichir } = useNotifications();
  const [open, setOpen] = useState(false);
  const [marquantVu, setMarquantVu] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleClick = (element: ElementNotification) => {
    setOpen(false);
    navigate(element.lien);
  };

  const handleMarquerVu = async (e: React.MouseEvent, element: ElementNotification) => {
    e.stopPropagation();
    setMarquantVu(element.cle);
    try {
      await marquerNotificationVue(element.cle);
      rafraichir();
    } catch {
      // Échec silencieux — l'élément reste affiché, l'utilisateur peut réessayer.
    } finally {
      setMarquantVu(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-[var(--color-surface-container)] relative"
        style={{ color: "var(--color-on-surface-variant)" }}
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[24px]">
          {total > 0 ? "notifications_active" : "notifications"}
        </span>
        {total > 0 && (
          <span
            className="absolute top-1 right-1 shrink-0 inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1"
            style={{ minWidth: "16px", height: "16px", backgroundColor: "var(--color-error)", color: "var(--color-on-error)" }}
          >
            {total > PLAFOND_AFFICHAGE ? `${PLAFOND_AFFICHAGE}+` : total}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute ${align === "left" ? "left-0" : "right-0"} mt-2 w-72 max-w-[90vw] rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-down`}
          style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-outline-variant)" }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
            <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>Notifications</p>
          </div>

          {elements.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <span className="material-symbols-outlined text-[36px]" style={{ color: "var(--color-outline)" }}>notifications_off</span>
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Rien en attente pour le moment.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {elements.map((element) => {
                const style = COULEURS_URGENCE[element.urgence];
                return (
                  <li key={element.cle} className="flex items-center hover:bg-[var(--color-surface-container-low)] transition-colors">
                    <button
                      onClick={() => handleClick(element)}
                      className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <span
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: style.bg, color: style.color }}
                      >
                        <span className="material-symbols-outlined text-[18px]">{element.icone}</span>
                      </span>
                      <span className="text-body-md font-medium min-w-0" style={{ color: "var(--color-on-surface)" }}>
                        {element.titre}
                      </span>
                      <span className="material-symbols-outlined ml-auto shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>chevron_right</span>
                    </button>
                    {element.peut_marquer_vu && (
                      <button
                        onClick={(e) => handleMarquerVu(e, element)}
                        disabled={marquantVu === element.cle}
                        className="shrink-0 w-8 h-8 mr-3 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container)] disabled:opacity-50"
                        style={{ color: "var(--color-on-surface-variant)" }}
                        aria-label={`Marquer « ${element.titre} » comme vu`}
                        title="Marquer comme vu"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {marquantVu === element.cle ? "hourglass_empty" : "close"}
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

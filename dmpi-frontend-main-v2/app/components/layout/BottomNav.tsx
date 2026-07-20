// BottomNav — Navigation mobile (visible uniquement sur petits écrans)
// Affiche les premiers éléments de NAV_ITEMS comme onglets directs, et
// regroupe le reste (s'il y en a) dans un onglet "Plus" — sans ça, un rôle
// avec 6-8 destinations (médecin, infirmier, super_admin...) en perdait la
// moitié, invisibles et inatteignables sur mobile.
import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { NAV_ITEMS, estRacineDeRole, PLAFOND_AFFICHAGE_BADGE, type NavItem } from "./navItems";

const NB_ONGLETS_DIRECTS = 3;

/** Badge de compteur positionné dans le coin d'une icône — variante
 * compacte du badge inline de la Sidebar, pensée pour les onglets étroits
 * et empilés verticalement de la BottomNav plutôt qu'une ligne horizontale. */
function BadgeCoin({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-1 -right-1.5 shrink-0 inline-flex items-center justify-center rounded-full text-[9px] font-bold px-1"
      style={{ minWidth: "16px", height: "16px", backgroundColor: "var(--color-error)", color: "var(--color-on-error)" }}
    >
      {count > PLAFOND_AFFICHAGE_BADGE ? `${PLAFOND_AFFICHAGE_BADGE}+` : count}
    </span>
  );
}

function OngletBottomNav({ item, estRacine, count }: { item: NavItem; estRacine: boolean; count: number }) {
  return (
    <NavLink
      to={item.to}
      end={estRacine}
      className={({ isActive }) =>
        [
          "flex flex-col items-center justify-center rounded-full p-2 transition-transform duration-200 active:scale-95",
          isActive
            ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] px-4"
            : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-16",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: isActive
                  ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                  : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              {item.icon}
            </span>
            <BadgeCoin count={count} />
          </span>
          <span className="text-[10px] font-bold mt-1 tracking-wide truncate max-w-[60px]">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const { elements } = useNotifications();
  const [showPlus, setShowPlus] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setShowPlus(false); }, [location.pathname]);

  useEffect(() => {
    if (!showPlus) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPlus(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPlus]);

  const compteurs = useMemo(() => {
    const parLien: Record<string, number> = {};
    for (const element of elements) {
      parLien[element.lien] = (parLien[element.lien] ?? 0) + element.compte;
    }
    return parLien;
  }, [elements]);

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] ?? [];
  const directs = navItems.slice(0, NB_ONGLETS_DIRECTS);
  const reste = navItems.slice(NB_ONGLETS_DIRECTS);
  const resteActif = reste.some((item) => location.pathname.startsWith(item.to));
  const compteReste = reste.reduce((total, item) => total + (compteurs[item.to] ?? 0), 0);

  return (
    <nav
      className="
        lg:hidden
        fixed bottom-4 left-5 right-5 z-40
        flex justify-around items-center px-2 py-2
        rounded-2xl
        backdrop-blur-md
      "
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {directs.map((item) => (
        <OngletBottomNav
          key={item.to}
          item={item}
          estRacine={estRacineDeRole(item.to, user.role)}
          count={compteurs[item.to] ?? 0}
        />
      ))}

      {reste.length > 0 && (
        <div className="relative" ref={ref}>
          <button
            onClick={() => setShowPlus((v) => !v)}
            className={[
              "flex flex-col items-center justify-center rounded-full p-2 transition-transform duration-200 active:scale-95",
              resteActif || showPlus
                ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] px-4"
                : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] w-16",
            ].join(" ")}
          >
            <span className="relative">
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings: (resteActif || showPlus) ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                }}
              >
                more_horiz
              </span>
              <BadgeCoin count={compteReste} />
            </span>
            <span className="text-[10px] font-bold mt-1 tracking-wide">Plus</span>
          </button>

          {showPlus && (
            <div
              className="absolute bottom-full right-0 mb-3 w-56 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-down"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-outline-variant)" }}
            >
              {reste.map((item) => {
                const count = compteurs[item.to] ?? 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={estRacineDeRole(item.to, user.role)}
                    className={({ isActive }) =>
                      [
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-container-low)]",
                        isActive ? "font-bold" : "",
                      ].join(" ")
                    }
                    style={({ isActive }) => ({ color: isActive ? "var(--color-primary)" : "var(--color-on-surface)" })}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-body-md flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className="shrink-0 inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5"
                        style={{ minWidth: "20px", height: "20px", backgroundColor: "var(--color-error)", color: "var(--color-on-error)" }}
                      >
                        {count > PLAFOND_AFFICHAGE_BADGE ? `${PLAFOND_AFFICHAGE_BADGE}+` : count}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// BottomNav — Navigation mobile (visible uniquement sur petits écrans)
// Affiche les premiers éléments de NAV_ITEMS comme onglets directs, et
// regroupe le reste (s'il y en a) dans un onglet "Plus" — sans ça, un rôle
// avec 6-8 destinations (médecin, infirmier, super_admin...) en perdait la
// moitié, invisibles et inatteignables sur mobile.
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { NAV_ITEMS, estRacineDeRole, type NavItem } from "./navItems";

const NB_ONGLETS_DIRECTS = 3;

function OngletBottomNav({ item, estRacine }: { item: NavItem; estRacine: boolean }) {
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
          <span className="text-[10px] font-bold mt-1 tracking-wide truncate max-w-[60px]">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
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

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] ?? [];
  const directs = navItems.slice(0, NB_ONGLETS_DIRECTS);
  const reste = navItems.slice(NB_ONGLETS_DIRECTS);
  const resteActif = reste.some((item) => location.pathname.startsWith(item.to));

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
        <OngletBottomNav key={item.to} item={item} estRacine={estRacineDeRole(item.to, user.role)} />
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
            <span
              className="material-symbols-outlined"
              style={{
                fontVariationSettings: (resteActif || showPlus) ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              more_horiz
            </span>
            <span className="text-[10px] font-bold mt-1 tracking-wide">Plus</span>
          </button>

          {showPlus && (
            <div
              className="absolute bottom-full right-0 mb-3 w-56 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-down"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-outline-variant)" }}
            >
              {reste.map((item) => (
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
                  <span className="text-body-md">{item.label}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

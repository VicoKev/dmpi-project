// BottomNav — Navigation mobile (visible uniquement sur petits écrans)
import { NavLink } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../types/auth";

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  medecin: [
    { to: "/medecin", icon: "home_health", label: "Accueil" },
    { to: "/medecin/patients", icon: "groups", label: "Patients" },
    { to: "/medecin/consultations", icon: "medical_services", label: "Consults" },
  ],
  infirmier: [
    { to: "/infirmier", icon: "home_health", label: "Accueil" },
    { to: "/infirmier/patients", icon: "groups", label: "Patients" },
    { to: "/infirmier/constantes", icon: "monitor_heart", label: "Constantes" },
  ],
  patient: [
    { to: "/patient", icon: "home_health", label: "Dossier" },
    { to: "/patient/ordonnances", icon: "prescriptions", label: "Ordonnances" },
    { to: "/patient/resultats", icon: "lab_panel", label: "Résultats" },
  ],
  admin_etablissement: [
    { to: "/admin", icon: "dashboard", label: "Dashboard" },
    { to: "/admin/supervision", icon: "supervisor_account", label: "Supervision" },
    { to: "/admin/statistiques", icon: "bar_chart", label: "Stats" },
  ],
  superadmin_national: [
    { to: "/superadmin", icon: "dashboard", label: "Dashboard" },
    { to: "/superadmin/etablissements", icon: "domain", label: "Établissem." },
    { to: "/superadmin/utilisateurs", icon: "manage_accounts", label: "Utilisateurs" },
  ],
};

export default function BottomNav() {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] ?? [];

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
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === `/${user.role}` || item.to === "/patient" || item.to === "/admin" || item.to === "/superadmin"}
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
              <span className="text-[10px] font-bold mt-1 tracking-wide">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

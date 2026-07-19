// Sidebar de navigation desktop — DMPI
// Mobile: cachée (remplacée par BottomNav)
// Desktop (lg+): fixe à gauche, 256px

import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import type { UserRole } from "../../types/auth";
import NotificationBell from "./NotificationBell";

interface NavItem {
  to: string;
  icon: string;
  iconActive?: string;
  label: string;
}

// Compteurs "en attente" par tab, dérivés de la cloche de notifications
// partagée (voir NotificationsContext) — un seul point de récupération pour
// les badges par lien ici et le panneau détaillé de la cloche.
const PLAFOND_AFFICHAGE = 99;

function NavCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-auto shrink-0 inline-flex items-center justify-center rounded-full text-[11px] font-bold px-1.5"
      style={{
        minWidth: "20px",
        height: "20px",
        backgroundColor: "var(--color-error)",
        color: "var(--color-on-error)",
      }}
    >
      {count > PLAFOND_AFFICHAGE ? `${PLAFOND_AFFICHAGE}+` : count}
    </span>
  );
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  medecin: [
    { to: "/medecin", icon: "home_health", iconActive: "home_health", label: "Tableau de bord" },
    { to: "/medecin/patients", icon: "groups", label: "Patients" },
    { to: "/medecin/consultations", icon: "medical_services", label: "Consultations" },
    { to: "/medecin/ordonnances", icon: "prescriptions", label: "Ordonnances" },
    { to: "/medecin/examens", icon: "biotech", label: "Examens" },
    { to: "/medecin/agenda", icon: "calendar_month", label: "Agenda" },
    { to: "/medecin/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
  ],
  infirmier: [
    { to: "/infirmier", icon: "home_health", label: "Tableau de bord" },
    { to: "/infirmier/file-attente", icon: "assignment_ind", label: "File d'attente" },
    { to: "/infirmier/patients", icon: "groups", label: "Patients" },
    { to: "/infirmier/constantes", icon: "monitor_heart", label: "Constantes" },
    { to: "/infirmier/traitements", icon: "medication", label: "Traitements" },
    { to: "/infirmier/historique", icon: "history", label: "Mon historique" },
    { to: "/infirmier/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
  ],
  patient: [
    { to: "/patient", icon: "home_health", label: "Mon dossier" },
    { to: "/patient/ordonnances", icon: "prescriptions", label: "Mes ordonnances" },
    { to: "/patient/resultats", icon: "lab_panel", label: "Mes résultats" },
    { to: "/patient/rendez-vous", icon: "calendar_month", label: "Mes rendez-vous" },
    { to: "/patient/etablissements-proches", icon: "local_hospital", label: "Établissements proches" },
  ],
  admin_etablissement: [
    { to: "/admin", icon: "dashboard", label: "Tableau de bord" },
    { to: "/admin/supervision", icon: "supervisor_account", label: "Supervision" },
    { to: "/admin/statistiques", icon: "bar_chart", label: "Statistiques" },
    { to: "/admin/etablissement", icon: "edit_location", label: "Mon établissement" },
    { to: "/admin/file-attente", icon: "assignment_ind", label: "File d'attente" },
    { to: "/admin/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
  ],
  superadmin_national: [
    { to: "/superadmin", icon: "dashboard", label: "Tableau de bord" },
    { to: "/superadmin/etablissements", icon: "domain", label: "Établissements" },
    { to: "/superadmin/prestataires", icon: "storefront", label: "Pharmacies & Laboratoires" },
    { to: "/superadmin/utilisateurs", icon: "manage_accounts", label: "Utilisateurs" },
    { to: "/superadmin/demandes-acces", icon: "how_to_reg", label: "Demandes d'accès" },
    { to: "/superadmin/audit", icon: "policy", label: "Journal d'audit" },
    { to: "/superadmin/monitoring", icon: "monitoring", label: "Monitoring" },
    { to: "/superadmin/rapports", icon: "analytics", label: "Rapports" },
  ],
  laboratoire: [
    { to: "/laboratoire", icon: "biotech", label: "Demandes d'examen" },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  medecin: "Médecin",
  infirmier: "Infirmier(e)",
  patient: "Patient",
  admin_etablissement: "Admin Établissement",
  superadmin_national: "Super Administrateur",
  laboratoire: "Laboratoire",
};

const ROLE_ICONS: Record<UserRole, string> = {
  medecin: "stethoscope",
  infirmier: "vaccines",
  patient: "person",
  admin_etablissement: "domain",
  superadmin_national: "admin_panel_settings",
  laboratoire: "biotech",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { elements } = useNotifications();

  const compteurs = useMemo(() => {
    const parLien: Record<string, number> = {};
    for (const element of elements) {
      parLien[element.lien] = (parLien[element.lien] ?? 0) + element.compte;
    }
    return parLien;
  }, [elements]);

  if (!user) return null;

  const navItems = NAV_ITEMS[user.role] ?? [];
  const roleLabel = ROLE_LABELS[user.role];
  const roleIcon = ROLE_ICONS[user.role];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = `${user.prenom[0] ?? ""}${user.nom[0] ?? ""}`.toUpperCase();

  return (
    <aside
      className="
        hidden lg:flex flex-col
        fixed left-0 top-0 h-screen z-30
        w-[256px]
        border-r border-[var(--color-outline-variant)]
      "
      style={{
        backgroundColor: "var(--color-surface-container-lowest)",
        boxShadow: "var(--shadow-sidebar)",
      }}
    >
      {/* Logo / En-tête */}
      <div
        className="flex items-center justify-between gap-3 px-5 h-16 border-b border-[var(--color-outline-variant)]"
        style={{ flexShrink: 0 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center animate-pulse-ring shrink-0"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            <span className="material-symbols-outlined filled text-[20px]">
              medical_services
            </span>
          </div>
          <div className="min-w-0">
            <span
              className="text-subheading block leading-tight truncate"
              style={{ color: "var(--color-primary)", fontFamily: "var(--font-heading)" }}
            >
              DMPI Bénin
            </span>
            <span
              className="text-caption block truncate"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Plateforme médicale
            </span>
          </div>
        </div>
        <NotificationBell align="left" />
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p
          className="text-label-bold px-3 pb-2 uppercase tracking-widest"
          style={{ color: "var(--color-outline)" }}
        >
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/${user.role}` || item.to === "/patient" || item.to === "/admin" || item.to === "/superadmin"}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                  : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[22px] shrink-0"
                  style={{
                    fontVariationSettings: isActive
                      ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                      : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                  }}
                >
                  {item.icon}
                </span>
                <span className="text-body-md font-semibold">{item.label}</span>
                <NavCountBadge count={compteurs[item.to] ?? 0} />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profil utilisateur + Déconnexion */}
      <div
        className="border-t border-[var(--color-outline-variant)] p-3 space-y-2"
        style={{ flexShrink: 0 }}
      >
        {/* Infos utilisateur */}
        <div
          className="flex items-center gap-3 px-2 py-2 rounded-xl"
          style={{ backgroundColor: "var(--color-surface-container-low)" }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.prenom} ${user.nom}`}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-body-md font-bold shrink-0"
              style={{
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary-container)",
              }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="text-body-md font-semibold truncate"
              style={{ color: "var(--color-on-surface)" }}
            >
              {user.prenom} {user.nom}
            </p>
            <div
              className="flex items-center gap-1 text-caption"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              <span className="material-symbols-outlined text-[12px]">{roleIcon}</span>
              <span className="truncate">{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* Établissement */}
        {user.etablissement && (
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-caption"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <span className="material-symbols-outlined text-[14px]">domain</span>
            <span className="truncate">{user.etablissement}</span>
          </div>
        )}

        {/* Bouton déconnexion */}
        <button
          onClick={handleLogout}
          className="
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            transition-all duration-200 group
            hover:bg-[var(--color-error-container)]
          "
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <span className="material-symbols-outlined text-[20px] group-hover:text-[var(--color-error)]">
            logout
          </span>
          <span className="text-body-md font-semibold group-hover:text-[var(--color-error)]">
            Déconnexion
          </span>
        </button>
      </div>
    </aside>
  );
}

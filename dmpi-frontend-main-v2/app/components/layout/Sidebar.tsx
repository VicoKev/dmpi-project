// Sidebar de navigation desktop — DMPI
// Mobile: cachée (remplacée par BottomNav)
// Desktop (lg+): fixe à gauche, 256px

import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationsContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useToast } from "../../contexts/ToastContext";
import type { UserRole } from "../../types/auth";
import NotificationBell from "./NotificationBell";
import ChangePasswordModal from "./ChangePasswordModal";
import SignalerCorrectionModal from "./SignalerCorrectionModal";
import { NAV_ITEMS, estRacineDeRole, PLAFOND_AFFICHAGE_BADGE } from "./navItems";
import { deconnecterAutresSessions } from "../../services/authService";

// Compteurs "en attente" par tab, dérivés de la cloche de notifications
// partagée (voir NotificationsContext) — un seul point de récupération pour
// les badges par lien ici et le panneau détaillé de la cloche.

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
      {count > PLAFOND_AFFICHAGE_BADGE ? `${PLAFOND_AFFICHAGE_BADGE}+` : count}
    </span>
  );
}

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
  const askConfirmation = useConfirm();
  const showToast = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSignalerCorrection, setShowSignalerCorrection] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deconnectingSessions, setDeconnectingSessions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleDeconnecterAutresSessions = async () => {
    setShowMenu(false);
    const ok = await askConfirmation({
      title: "Déconnecter mes autres sessions",
      message: "Toute autre session ouverte avec ce compte (un autre appareil, un navigateur oublié…) sera déconnectée. Cette session-ci reste active.",
      confirmLabel: "Déconnecter",
    });
    if (!ok) return;
    setDeconnectingSessions(true);
    try {
      await deconnecterAutresSessions();
      showToast("Vos autres sessions ont été déconnectées.");
    } catch (err) {
      showToast((err as Error).message || "Erreur lors de la déconnexion des autres sessions.", "error");
    } finally {
      setDeconnectingSessions(false);
    }
  };

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

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
            end={estRacineDeRole(item.to, user.role)}
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

      {/* Profil utilisateur — clic pour ouvrir le menu (changer mot de passe / déconnexion) */}
      <div
        className="relative border-t border-[var(--color-outline-variant)] p-3"
        style={{ flexShrink: 0 }}
        ref={menuRef}
      >
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-[var(--color-surface-container)]"
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
          <div className="flex-1 min-w-0 text-left">
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
          <span
            className="material-symbols-outlined text-[20px] shrink-0"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {showMenu ? "expand_more" : "expand_less"}
          </span>
        </button>

        {/* Établissement */}
        {user.etablissement && (
          <div
            className="flex items-center gap-2 px-2 pt-1.5 text-caption"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <span className="material-symbols-outlined text-[14px]">domain</span>
            <span className="truncate">{user.etablissement}</span>
          </div>
        )}

        {showMenu && (
          <div
            className="absolute left-3 right-3 bottom-full mb-2 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-down"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-outline-variant)" }}
          >
            <button
              onClick={() => { setShowMenu(false); setShowChangePassword(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-container-low)]"
              style={{ color: "var(--color-on-surface)" }}
            >
              <span className="material-symbols-outlined text-[20px]">lock_reset</span>
              <span className="text-body-md font-semibold">Changer mon mot de passe</span>
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowSignalerCorrection(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-container-low)]"
              style={{ color: "var(--color-on-surface)" }}
            >
              <span className="material-symbols-outlined text-[20px]">edit_note</span>
              <span className="text-body-md font-semibold">Signaler une erreur sur mon compte</span>
            </button>
            <button
              onClick={handleDeconnecterAutresSessions}
              disabled={deconnectingSessions}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-surface-container-low)] disabled:opacity-60"
              style={{ color: "var(--color-on-surface)" }}
            >
              <span className="material-symbols-outlined text-[20px]">devices_off</span>
              <span className="text-body-md font-semibold">Déconnecter mes autres sessions</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-error-container)]"
              style={{ color: "var(--color-error)" }}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-body-md font-semibold">Déconnexion</span>
            </button>
          </div>
        )}
      </div>

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {showSignalerCorrection && <SignalerCorrectionModal onClose={() => setShowSignalerCorrection(false)} />}
    </aside>
  );
}

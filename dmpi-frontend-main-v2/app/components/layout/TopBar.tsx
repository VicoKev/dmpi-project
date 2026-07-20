// TopBar — Barre supérieure (visible principalement sur mobile)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useToast } from "../../contexts/ToastContext";
import type { UserRole } from "../../types/auth";
import NotificationBell from "./NotificationBell";
import ChangePasswordModal from "./ChangePasswordModal";
import SignalerCorrectionModal from "./SignalerCorrectionModal";
import { deconnecterAutresSessions } from "../../services/authService";

const ROLE_LABELS: Record<UserRole, string> = {
  medecin: "Médecin",
  infirmier: "Infirmier(e)",
  patient: "Patient",
  admin_etablissement: "Admin Établissement",
  superadmin_national: "Super Administrateur",
  laboratoire: "Laboratoire",
};

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const askConfirmation = useConfirm();
  const showToast = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSignalerCorrection, setShowSignalerCorrection] = useState(false);
  const [deconnectingSessions, setDeconnectingSessions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      if (ref.current && !ref.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role];
  const initials = `${user.prenom[0] ?? ""}${user.nom[0] ?? ""}`.toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header
      className="lg:hidden flex items-center justify-between px-5 h-[64px] sticky top-0 z-30"
      style={{
        backgroundColor: "var(--color-surface)",
        color: "var(--color-on-background)",
      }}
    >
      <div className="relative" ref={ref}>
        <button className="flex items-center gap-3" onClick={() => setShowMenu((v) => !v)}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.prenom} ${user.nom}`}
              className="w-10 h-10 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-subheading shadow-sm"
              style={{
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary-container)",
              }}
            >
              {initials}
            </div>
          )}
          <div className="flex flex-col text-left">
            <span
              className="text-headline-md leading-tight truncate max-w-[200px]"
              style={{ color: "var(--color-primary)" }}
            >
              DMPI Bénin
            </span>
            <span
              className="text-caption"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {roleLabel}
            </span>
          </div>
        </button>

        {showMenu && (
          <div
            className="absolute left-0 mt-2 w-64 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-down"
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

      <NotificationBell />

      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
      {showSignalerCorrection && <SignalerCorrectionModal onClose={() => setShowSignalerCorrection(false)} />}
    </header>
  );
}

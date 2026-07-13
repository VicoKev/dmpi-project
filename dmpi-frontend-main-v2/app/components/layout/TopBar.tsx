// TopBar — Barre supérieure (visible principalement sur mobile)
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../types/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  medecin: "Médecin",
  infirmier: "Infirmier(e)",
  patient: "Patient",
  admin_etablissement: "Admin Établissement",
  superadmin_national: "Super Administrateur",
};

export default function TopBar() {
  const { user } = useAuth();

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role];
  const initials = `${user.prenom[0] ?? ""}${user.nom[0] ?? ""}`.toUpperCase();

  return (
    <header
      className="lg:hidden flex items-center justify-between px-5 h-[64px] sticky top-0 z-30"
      style={{
        backgroundColor: "var(--color-surface)",
        color: "var(--color-on-background)",
      }}
    >
      <div className="flex items-center gap-3">
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
        <div className="flex flex-col">
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
      </div>

      <button
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-[var(--color-surface-container)]"
        style={{ color: "var(--color-on-surface-variant)" }}
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[24px]">notifications</span>
      </button>
    </header>
  );
}

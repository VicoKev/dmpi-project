// Composant Badge — Design system DMPI
import type { ReactNode } from "react";

type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  icon?: string;
  size?: "sm" | "md";
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: {
    bg: "var(--color-primary-fixed-dim)",
    text: "var(--color-on-primary-fixed)",
  },
  secondary: {
    bg: "var(--color-secondary-container)",
    text: "var(--color-on-secondary-container)",
  },
  success: {
    bg: "var(--color-success-container)",
    text: "var(--color-on-success-container)",
  },
  warning: {
    bg: "var(--color-warning-container)",
    text: "var(--color-on-warning-container)",
  },
  error: {
    bg: "var(--color-error-container)",
    text: "var(--color-on-error-container)",
  },
  neutral: {
    bg: "var(--color-surface-container-high)",
    text: "var(--color-on-surface-variant)",
  },
  info: {
    bg: "var(--color-tertiary-fixed)",
    text: "var(--color-on-tertiary-fixed-variant)",
  },
};

export default function Badge({
  children,
  variant = "neutral",
  icon,
  size = "sm",
  className = "",
}: BadgeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <span
      className={[
        "inline-flex items-center rounded-full font-sans font-bold",
        size === "sm" ? "text-[11px] px-2.5 py-1 gap-1" : "text-xs px-3 py-1.5 gap-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: styles.bg, color: styles.text }}
    >
      {icon && (
        <span
          className="material-symbols-outlined"
          style={{ fontSize: size === "sm" ? "13px" : "15px" }}
        >
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

// ─── Badge statut consultation ────────────────────────────────────────────────
export function StatutBadge({
  statut,
}: {
  statut:
    | "brouillon"
    | "validee"
    | "signee"
    | "en_attente"
    | "disponible"
    | "urgent"
    | "dispensee"
    | "expiree";
}) {
  const config: Record<string, { variant: BadgeVariant; label: string; icon: string }> = {
    brouillon: { variant: "neutral", label: "Brouillon", icon: "edit_note" },
    validee: { variant: "info", label: "Validée", icon: "check_circle" },
    signee: { variant: "success", label: "Signée", icon: "verified" },
    en_attente: { variant: "warning", label: "En attente", icon: "schedule" },
    disponible: { variant: "success", label: "Disponible", icon: "check_circle" },
    urgent: { variant: "error", label: "Urgent", icon: "priority_high" },
    dispensee: { variant: "info", label: "Dispensée", icon: "local_pharmacy" },
    expiree: { variant: "neutral", label: "Expirée", icon: "event_busy" },
  };

  const c = config[statut] ?? config.brouillon;
  return (
    <Badge variant={c.variant} icon={c.icon} size="sm">
      {c.label}
    </Badge>
  );
}

// ─── Badge Allergie (alerte) ──────────────────────────────────────────────────
export function AllergieBadge({ substance }: { substance: string }) {
  return (
    <Badge variant="error" icon="warning" size="sm">
      Allergie : {substance}
    </Badge>
  );
}

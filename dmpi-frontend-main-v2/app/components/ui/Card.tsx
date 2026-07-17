// Composant Card — Design system DMPI
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "default" | "glass" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  /** Classe de bordure gauche colorée (ex: "border-l-4 border-[var(--color-primary)]") */
  accentBorder?: string;
}

const VARIANT_STYLES: Record<string, string> = {
  default:
    "bg-[var(--color-surface-container-lowest)] shadow-[var(--shadow-card)]",
  glass:
    "bg-white/90 backdrop-blur-md border border-white/30 shadow-[var(--shadow-card)]",
  elevated:
    "bg-[var(--color-surface-container-lowest)] shadow-[var(--shadow-card-hover)]",
};

const PADDING_STYLES: Record<string, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export default function Card({
  children,
  variant = "default",
  padding = "md",
  accentBorder = "",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl",
        VARIANT_STYLES[variant],
        PADDING_STYLES[padding],
        accentBorder,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

interface CardHeaderProps {
  icon?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ icon, title, action, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between flex-wrap gap-2 mb-3 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: "var(--color-primary-fixed-dim)",
              color: "var(--color-on-primary-fixed)",
            }}
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </div>
        )}
        <h3 className="text-subheading" style={{ color: "var(--color-primary)" }}>
          {title}
        </h3>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

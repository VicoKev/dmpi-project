// Composant Button — Design system DMPI
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string; // Material Symbol name
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:opacity-90 shadow-sm",
  secondary:
    "bg-[var(--color-secondary)] text-[var(--color-on-secondary)] hover:opacity-90 shadow-sm",
  outline:
    "border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent hover:bg-[var(--color-surface-container-low)]",
  ghost:
    "text-[var(--color-primary)] bg-transparent hover:bg-[var(--color-surface-container)]",
  danger:
    "bg-[var(--color-error)] text-[var(--color-on-error)] hover:opacity-90 shadow-sm",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-label-bold gap-1.5",
  md: "px-6 py-3 text-label-bold gap-2",
  lg: "px-8 py-4 text-subheading gap-2",
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: "text-[16px]",
  md: "text-[18px]",
  lg: "text-[20px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center rounded-full font-sans font-bold transition-all duration-200",
        "active:scale-95 focus-visible:outline-2",
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        fullWidth ? "w-full" : "",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="material-symbols-outlined animate-spin text-[18px]"
            style={{ animationDuration: "0.8s" }}
          >
            progress_activity
          </span>
          <span>Chargement…</span>
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className={`material-symbols-outlined ${ICON_SIZE[size]}`}>
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === "right" && (
            <span className={`material-symbols-outlined ${ICON_SIZE[size]}`}>
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

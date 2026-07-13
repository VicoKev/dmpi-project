// Composant Spinner — Design system DMPI
interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: "w-5 h-5 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-3",
};

export default function Spinner({ size = "md", label, className = "" }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} role="status">
      <div
        className={[
          SIZE_CLASSES[size],
          "rounded-full animate-spin",
          "border-[var(--color-surface-container-high)]",
          "border-t-[var(--color-primary)]",
        ].join(" ")}
        style={{
          borderColor: "var(--color-surface-container-high)",
          borderTopColor: "var(--color-primary)",
        }}
      />
      {label && (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          {label}
        </p>
      )}
      <span className="sr-only">{label ?? "Chargement en cours"}</span>
    </div>
  );
}

// ─── Overlay de chargement plein écran ───────────────────────────────────────
export function LoadingOverlay({ label = "Chargement…" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(247, 249, 252, 0.85)", backdropFilter: "blur(4px)" }}
    >
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-[var(--shadow-card)]"
          style={{ backgroundColor: "var(--color-surface-container-lowest)" }}
        >
          <Spinner size="lg" />
        </div>
        <p className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

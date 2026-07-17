// Onglets de navigation du dossier patient
// Mobile : scrollable horizontalement. Desktop : tous visibles.

export type DossierTabKey =
  | "synthese"
  | "consultations"
  | "constantes"
  | "ordonnances"
  | "examens";

interface Tab {
  key: DossierTabKey;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { key: "synthese", label: "Synthèse", icon: "summarize" },
  { key: "consultations", label: "Consultations", icon: "medical_services" },
  { key: "constantes", label: "Constantes", icon: "monitor_heart" },
  { key: "ordonnances", label: "Ordonnances", icon: "prescriptions" },
  { key: "examens", label: "Examens", icon: "lab_panel" },
];

interface DossierTabsProps {
  active: DossierTabKey;
  onChange: (tab: DossierTabKey) => void;
}

export default function DossierTabs({ active, onChange }: DossierTabsProps) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1 -mb-px border-b"
      style={{ borderColor: "var(--color-outline-variant)" }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={[
              "flex items-center gap-2 px-4 py-3 shrink-0 whitespace-nowrap",
              "text-body-md font-semibold transition-all duration-200 border-b-2",
              isActive
                ? "border-current"
                : "border-transparent hover:bg-[var(--color-surface-container)]",
            ].join(" ")}
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-on-surface-variant)",
            }}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{
                fontVariationSettings: isActive
                  ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
                  : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              {tab.icon}
            </span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

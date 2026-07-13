// Carte Antécédents — médical / chirurgical / familial / obstétrical
import Card, { CardHeader } from "../ui/Card";
import Badge from "../ui/Badge";
import type { Antecedent } from "../../types/patient";

const TYPE_CONFIG: Record<Antecedent["type"], { label: string; icon: string }> = {
  medical: { label: "Médical", icon: "medical_information" },
  chirurgical: { label: "Chirurgical", icon: "surgical" },
  familial: { label: "Familial", icon: "family_restroom" },
  obstetrical: { label: "Obstétrical", icon: "pregnant_woman" },
};

export default function AntecedentsCard({ antecedents }: { antecedents: Antecedent[] }) {
  return (
    <Card>
      <CardHeader icon="history" title="Antécédents" />
      {antecedents.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucun antécédent renseigné.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {antecedents.map((a) => {
            const config = TYPE_CONFIG[a.type];
            return (
              <li
                key={a.id}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                <span
                  className="material-symbols-outlined text-[20px] mt-0.5"
                  style={{ color: "var(--color-primary)" }}
                >
                  {config.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {a.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="neutral" size="sm">{config.label}</Badge>
                    {a.annee && (
                      <span className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        Depuis {a.annee}
                      </span>
                    )}
                    {a.cim10Code && (
                      <span className="text-caption font-mono" style={{ color: "var(--color-outline)" }}>
                        {a.cim10Code}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

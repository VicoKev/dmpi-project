// Carte du carnet de vaccination
import Card, { CardHeader } from "../ui/Card";
import { formatDateFr } from "../../services/patientService";
import type { Vaccination } from "../../types/patient";

export default function VaccinationsCard({ vaccinations }: { vaccinations: Vaccination[] }) {
  return (
    <Card>
      <CardHeader icon="vaccines" title="Carnet de vaccination" />
      {vaccinations.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucune vaccination enregistrée.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {vaccinations.map((v) => (
            <li
              key={v.id}
              className="flex items-start justify-between gap-3 p-3 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="min-w-0">
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {v.vaccin}
                </p>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  {formatDateFr(v.dateAdministration)}
                  {v.etablissement ? ` · ${v.etablissement}` : ""}
                </p>
              </div>
              {v.prochainRappel && (
                <span className="text-caption shrink-0" style={{ color: "var(--color-warning)" }}>
                  Rappel : {formatDateFr(v.prochainRappel)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

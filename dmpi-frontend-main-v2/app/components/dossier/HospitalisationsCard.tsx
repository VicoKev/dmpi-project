// Carte des hospitalisations passées
import Card, { CardHeader } from "../ui/Card";
import { formatDateFr } from "../../services/patientService";
import type { Hospitalisation } from "../../types/patient";

export default function HospitalisationsCard({
  hospitalisations,
}: {
  hospitalisations: Hospitalisation[];
}) {
  if (hospitalisations.length === 0) return null;

  return (
    <Card>
      <CardHeader icon="local_hospital" title="Hospitalisations" />
      <ul className="flex flex-col gap-3">
        {hospitalisations.map((h) => (
          <li
            key={h.id}
            className="p-3 rounded-xl"
            style={{ backgroundColor: "var(--color-surface-container-low)" }}
          >
            <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
              {h.motif}
            </p>
            <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
              {formatDateFr(h.dateEntree)}
              {h.dateSortie ? ` → ${formatDateFr(h.dateSortie)}` : " (en cours)"}
              {h.etablissement ? ` · ${h.etablissement}` : ""}
              {h.serviceHospitalier ? ` · ${h.serviceHospitalier}` : ""}
            </p>
            {h.compteRendu && (
              <p className="text-body-md mt-2" style={{ color: "var(--color-on-surface)" }}>
                {h.compteRendu}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

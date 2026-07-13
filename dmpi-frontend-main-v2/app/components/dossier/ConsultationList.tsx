// Liste des consultations d'un patient
import Card, { CardHeader } from "../ui/Card";
import { StatutBadge } from "../ui/Badge";
import { formatDateFr } from "../../services/patientService";
import type { Consultation } from "../../types/consultation";

export default function ConsultationList({
  consultations,
  loading,
}: {
  consultations: Consultation[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader icon="medical_services" title="Historique des consultations" />

      {loading ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Chargement…
        </p>
      ) : consultations.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucune consultation enregistrée pour ce patient.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {consultations.map((c) => (
            <li
              key={c.id}
              className="p-4 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {c.motif}
                  </p>
                  <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                    {formatDateFr(c.date)} · {c.medecin} · {c.etablissement}
                  </p>
                </div>
                <StatutBadge statut={c.statut} />
              </div>

              {c.diagnosticPrincipal && (
                <p className="text-caption mt-2" style={{ color: "var(--color-on-surface-variant)" }}>
                  <span className="font-semibold">Diagnostic :</span>{" "}
                  {c.diagnosticPrincipal.libelle} ({c.diagnosticPrincipal.code})
                </p>
              )}

              {c.conclusion && (
                <p className="text-body-md mt-2" style={{ color: "var(--color-on-surface)" }}>
                  {c.conclusion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

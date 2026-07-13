// Liste des ordonnances d'un patient
import Card, { CardHeader } from "../ui/Card";
import { StatutBadge } from "../ui/Badge";
import { FREQUENCE_LABELS } from "../../types/prescription";
import { formatDateFr } from "../../services/patientService";
import type { Prescription } from "../../types/prescription";

export default function PrescriptionList({
  prescriptions,
  loading,
}: {
  prescriptions: Prescription[];
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader icon="prescriptions" title="Ordonnances" />

      {loading ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Chargement…
        </p>
      ) : prescriptions.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucune ordonnance enregistrée pour ce patient.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {prescriptions.map((p) => (
            <li
              key={p.id}
              className="p-4 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  {formatDateFr(p.date)} · {p.prescripteur} · {p.etablissement}
                </p>
                <StatutBadge statut={p.statut} />
              </div>

              <ul className="flex flex-col gap-1.5">
                {p.lignes.map((ligne) => (
                  <li
                    key={ligne.id}
                    className="flex items-start gap-2 text-body-md"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    <span
                      className="material-symbols-outlined text-[16px] mt-0.5"
                      style={{ color: "var(--color-primary)" }}
                    >
                      medication
                    </span>
                    <span>
                      <span className="font-semibold">{ligne.medicament}</span>{" "}
                      {ligne.dosage} — {FREQUENCE_LABELS[ligne.frequence]}
                      {ligne.dureeJours ? ` pendant ${ligne.dureeJours} jours` : ""}
                    </span>
                  </li>
                ))}
              </ul>

              {p.noteGlobale && (
                <p
                  className="text-caption mt-2 pt-2 border-t"
                  style={{
                    color: "var(--color-on-surface-variant)",
                    borderColor: "var(--color-outline-variant)",
                  }}
                >
                  {p.noteGlobale}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

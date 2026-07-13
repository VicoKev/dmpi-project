// Carte des examens et résultats (biologie, imagerie...)
import Card, { CardHeader } from "../ui/Card";
import { StatutBadge } from "../ui/Badge";
import { formatDateFr } from "../../services/patientService";
import type { ResultatExamen } from "../../types/patient";

const TYPE_ICONS: Record<ResultatExamen["type"], string> = {
  biologie: "biotech",
  imagerie: "medical_mask",
  ecg: "monitor_heart",
  anatomopathologie: "microscope",
  autre: "description",
};

export default function ExamensCard({ examens }: { examens: ResultatExamen[] }) {
  return (
    <Card>
      <CardHeader icon="lab_panel" title="Examens & résultats" />
      {examens.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucun examen enregistré.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {examens.map((ex) => (
            <li
              key={ex.id}
              className="p-4 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span
                    className="material-symbols-outlined text-[20px] mt-0.5"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {TYPE_ICONS[ex.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {ex.libelle}
                    </p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      {formatDateFr(ex.date)}
                      {ex.laboratoire ? ` · ${ex.laboratoire}` : ""}
                    </p>
                  </div>
                </div>
                <StatutBadge statut={ex.statut} />
              </div>

              {ex.valeurs && ex.valeurs.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-caption">
                    <thead>
                      <tr style={{ color: "var(--color-on-surface-variant)" }}>
                        <th className="text-left font-semibold pb-1 pr-3">Paramètre</th>
                        <th className="text-left font-semibold pb-1 pr-3">Valeur</th>
                        <th className="text-left font-semibold pb-1">Normale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.valeurs.map((v, i) => (
                        <tr key={i}>
                          <td className="py-1 pr-3">{v.parametre}</td>
                          <td
                            className="py-1 pr-3 font-semibold"
                            style={{
                              color: v.anormal ? "var(--color-error)" : "var(--color-on-surface)",
                            }}
                          >
                            {v.valeur} {v.unite ?? ""}
                          </td>
                          <td className="py-1" style={{ color: "var(--color-on-surface-variant)" }}>
                            {v.valeurNormale ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {ex.commentaire && (
                <p className="text-caption mt-2" style={{ color: "var(--color-on-surface-variant)" }}>
                  {ex.commentaire}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

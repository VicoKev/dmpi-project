// Carte Traitements en cours
import Card, { CardHeader } from "../ui/Card";
import Badge from "../ui/Badge";
import type { Traitement } from "../../types/patient";

export default function TraitementsCard({ traitements }: { traitements: Traitement[] }) {
  const actifs = traitements.filter((t) => t.actif);

  return (
    <Card>
      <CardHeader icon="medication" title="Traitements en cours" />
      {actifs.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucun traitement en cours.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actifs.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="min-w-0">
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {t.medicament} — {t.dosage}
                </p>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  {t.frequence}
                  {t.prescripteur ? ` · Prescrit par ${t.prescripteur}` : ""}
                </p>
              </div>
              <Badge variant="success" size="sm">Actif</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

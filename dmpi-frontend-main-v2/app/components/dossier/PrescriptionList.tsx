// Liste des ordonnances d'un patient
import { useState } from "react";
import Card, { CardHeader } from "../ui/Card";
import Badge, { StatutBadge } from "../ui/Badge";
import Button from "../ui/Button";
import { FREQUENCE_LABELS } from "../../types/prescription";
import { formatDateFr } from "../../services/patientService";
import { renouvelerPrescription } from "../../services/prescriptionService";
import type { Prescription } from "../../types/prescription";

export default function PrescriptionList({
  prescriptions,
  loading,
  peutRenouveler = false,
  onRenouvele,
}: {
  prescriptions: Prescription[];
  loading?: boolean;
  /** Autorise le bouton "Renouveler" (réservé aux médecins). */
  peutRenouveler?: boolean;
  /** Appelé après un renouvellement réussi, pour rafraîchir la liste côté parent. */
  onRenouvele?: () => void;
}) {
  const [renouvellementEnCours, setRenouvellementEnCours] = useState<string | null>(null);
  const [erreurParOrdonnance, setErreurParOrdonnance] = useState<Record<string, string>>({});

  const handleRenouveler = async (id: string) => {
    setRenouvellementEnCours(id);
    setErreurParOrdonnance((prev) => {
      const { [id]: _retire, ...reste } = prev;
      return reste;
    });
    try {
      await renouvelerPrescription(id);
      onRenouvele?.();
    } catch (err) {
      setErreurParOrdonnance((prev) => ({
        ...prev,
        [id]: (err as Error).message || "Impossible de renouveler cette ordonnance.",
      }));
    } finally {
      setRenouvellementEnCours(null);
    }
  };

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
          {prescriptions.map((p) => {
            const aDesLignesRenouvelables = p.lignes.some((l) => l.renouvelable);
            return (
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
                      <span className="flex-1">
                        <span className="font-semibold">{ligne.medicament}</span>{" "}
                        {ligne.dosage} — {FREQUENCE_LABELS[ligne.frequence]}
                        {ligne.dureeJours ? ` pendant ${ligne.dureeJours} jours` : ""}
                        {ligne.renouvelable && (
                          <Badge variant="info" icon="autorenew" size="sm" className="ml-2 align-middle">
                            Renouvelable
                          </Badge>
                        )}
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

                {peutRenouveler && aDesLignesRenouvelables && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="autorenew"
                      loading={renouvellementEnCours === p.id}
                      onClick={() => handleRenouveler(p.id)}
                    >
                      Renouveler
                    </Button>
                    {erreurParOrdonnance[p.id] && (
                      <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
                        {erreurParOrdonnance[p.id]}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

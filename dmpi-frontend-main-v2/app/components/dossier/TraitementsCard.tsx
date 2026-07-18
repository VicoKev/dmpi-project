// Carte Traitements en cours
import { useState } from "react";
import Card, { CardHeader } from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Textarea from "../ui/Textarea";
import { formatDateFr } from "../../services/patientService";
import type { Traitement } from "../../types/patient";

export default function TraitementsCard({
  traitements,
  onArreter,
  titre = "Traitements en cours",
}: {
  traitements: Traitement[];
  /** Fourni uniquement côté médecin — arrêter un traitement est une décision clinique. */
  onArreter?: (index: number, motif?: string) => Promise<void> | void;
  titre?: string;
}) {
  const [indexEnArret, setIndexEnArret] = useState<number | null>(null);
  const [motif, setMotif] = useState("");
  const [indexEnCours, setIndexEnCours] = useState<number | null>(null);
  const [showHistorique, setShowHistorique] = useState(false);

  const actifs = traitements.filter((t) => t.actif);
  const arretes = traitements.filter((t) => !t.actif);

  const ouvrirArret = (index: number) => {
    setIndexEnArret(index);
    setMotif("");
  };

  const confirmerArret = async (index: number) => {
    if (!onArreter) return;
    setIndexEnCours(index);
    try {
      await onArreter(index, motif);
      setIndexEnArret(null);
      setMotif("");
    } finally {
      setIndexEnCours(null);
    }
  };

  return (
    <Card>
      <CardHeader icon="medication" title={titre} />
      {actifs.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucun traitement en cours.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actifs.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-2 p-3 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {t.medicament} — {t.dosage}
                  </p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {t.frequence}
                    {t.prescripteur ? ` · Prescrit par ${t.prescripteur}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="success" size="sm">Actif</Badge>
                  {onArreter && indexEnArret !== t.index && (
                    <Button variant="outline" size="sm" icon="block" onClick={() => ouvrirArret(t.index)}>
                      Arrêter
                    </Button>
                  )}
                </div>
              </div>

              {indexEnArret === t.index && (
                <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <Textarea
                    placeholder="Motif de l'arrêt (optionnel)…"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={indexEnCours === t.index}
                      onClick={() => setIndexEnArret(null)}
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon="block"
                      loading={indexEnCours === t.index}
                      onClick={() => confirmerArret(t.index)}
                    >
                      Arrêter le traitement
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {arretes.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
          <button
            type="button"
            onClick={() => setShowHistorique((v) => !v)}
            className="flex items-center gap-1 text-caption font-semibold cursor-pointer"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <span className="material-symbols-outlined text-[16px]">
              {showHistorique ? "expand_less" : "expand_more"}
            </span>
            Traitements arrêtés ({arretes.length})
          </button>

          {showHistorique && (
            <ul className="flex flex-col gap-2 mt-2">
              {arretes.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl opacity-75"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {t.medicament} — {t.dosage}
                    </p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      Arrêté{t.dateFin ? ` le ${formatDateFr(t.dateFin)}` : ""}
                      {t.motifArret ? ` — ${t.motifArret}` : ""}
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm">Arrêté</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

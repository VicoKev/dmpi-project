// Liste des ordonnances d'un patient
import { useState } from "react";
import Card, { CardHeader } from "../ui/Card";
import Badge, { StatutBadge } from "../ui/Badge";
import Button from "../ui/Button";
import { FREQUENCE_LABELS } from "../../types/prescription";
import { formatDateFr } from "../../services/patientService";
import { renouvelerPrescription, ordonnanceIdDepuisPrescriptionId } from "../../services/prescriptionService";
import type { Prescription } from "../../types/prescription";

export default function PrescriptionList({
  prescriptions,
  loading,
  peutRenouveler = false,
  onRenouvele,
  limit,
}: {
  prescriptions: Prescription[];
  loading?: boolean;
  /** Autorise le bouton "Renouveler" (réservé aux médecins). */
  peutRenouveler?: boolean;
  /** Appelé après un renouvellement réussi, pour rafraîchir la liste côté parent. */
  onRenouvele?: () => void;
  /**
   * Limite le nombre d'ordonnances affichées (ex. aperçu "Dernières
   * ordonnances" de la synthèse). Le tri renouvelée/originale se fait
   * toujours sur la liste complète — passer une liste déjà tronquée en
   * amont casse l'appariement dès que l'ordonnance renouvelée sort du
   * sous-ensemble affiché.
   */
  limit?: number;
}) {
  const [renouvellementEnCours, setRenouvellementEnCours] = useState<string | null>(null);
  const [erreurParLigne, setErreurParLigne] = useState<Record<string, string>>({});

  // `p.id` est préfixé ("pres_<idMongo>") côté frontend, mais
  // `renouveleeDepuis` (écrit par le backend) contient l'id Mongo brut — sans
  // cette normalisation, la comparaison ne matche jamais.
  const idBrut = (p: Prescription) => ordonnanceIdDepuisPrescriptionId(p.id);

  // Un médicament renouvelé se retrouve sur une AUTRE ordonnance (celle créée
  // par le renouvellement), identifiée par (ordonnance d'origine, position du
  // médicament dans cette ordonnance) — calculé sur la liste complète, avant
  // toute troncature d'affichage. Les anciens renouvellements groupés
  // (avant l'introduction du renouvellement par médicament) n'ont pas
  // d'index : ils s'appliquaient à tous les médicaments renouvelables de
  // l'ordonnance à la fois, d'où le repli sur `renouvellementsGroupes`.
  const renouvellementsExacts = new Map<string, Prescription>();
  const renouvellementsGroupes = new Map<string, Prescription>();
  for (const p of prescriptions) {
    if (!p.renouveleeDepuis) continue;
    if (p.renouveleeDepuisIndex !== null && p.renouveleeDepuisIndex !== undefined) {
      renouvellementsExacts.set(`${p.renouveleeDepuis}_${p.renouveleeDepuisIndex}`, p);
    } else {
      renouvellementsGroupes.set(p.renouveleeDepuis, p);
    }
  }

  const prescriptionsAffichees = limit ? prescriptions.slice(0, limit) : prescriptions;

  const handleRenouveler = async (prescriptionId: string, medicamentIndex: number, medicamentNom: string) => {
    if (!confirm(`Renouveler « ${medicamentNom} » ? Une nouvelle ordonnance sera créée pour ce médicament.`)) return;
    const cle = `${prescriptionId}_${medicamentIndex}`;
    setRenouvellementEnCours(cle);
    setErreurParLigne((prev) => {
      const { [cle]: _retire, ...reste } = prev;
      return reste;
    });
    try {
      await renouvelerPrescription(prescriptionId, medicamentIndex);
      onRenouvele?.();
    } catch (err) {
      setErreurParLigne((prev) => ({
        ...prev,
        [cle]: (err as Error).message || "Impossible de renouveler ce médicament.",
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
      ) : prescriptionsAffichees.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucune ordonnance enregistrée pour ce patient.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {prescriptionsAffichees.map((p) => {
            const rawId = idBrut(p);
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

                <ul className="flex flex-col gap-2">
                  {p.lignes.map((ligne, index) => {
                    const renouvellement = ligne.renouvelable
                      ? renouvellementsExacts.get(`${rawId}_${index}`) ?? renouvellementsGroupes.get(rawId)
                      : undefined;
                    const dejaRenouvelee = !!renouvellement;
                    const cleAction = `${p.id}_${index}`;

                    return (
                      <li
                        key={ligne.id}
                        className="flex flex-wrap items-start justify-between gap-2 text-body-md"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span
                            className="material-symbols-outlined text-[16px] mt-0.5 shrink-0"
                            style={{
                              color: dejaRenouvelee ? "var(--color-outline)" : "var(--color-primary)",
                            }}
                          >
                            medication
                          </span>
                          <span
                            className="flex-1 min-w-0"
                            style={{ color: dejaRenouvelee ? "var(--color-on-surface-variant)" : "var(--color-on-surface)" }}
                          >
                            <span className="font-semibold">{ligne.medicament}</span>{" "}
                            {ligne.dosage} — {FREQUENCE_LABELS[ligne.frequence]}
                            {ligne.dureeJours ? ` pendant ${ligne.dureeJours} jours` : ""}
                            {ligne.renouvelable && (
                              <Badge
                                variant={dejaRenouvelee ? "neutral" : "info"}
                                icon={dejaRenouvelee ? "check" : "autorenew"}
                                size="sm"
                                className="ml-2 align-middle"
                              >
                                {dejaRenouvelee ? "Renouvelé" : "Renouvelable"}
                              </Badge>
                            )}
                          </span>
                        </div>

                        {peutRenouveler && ligne.renouvelable && (
                          dejaRenouvelee ? (
                            <Badge variant="success" icon="check_circle" size="sm" className="shrink-0">
                              Renouvelé le {formatDateFr(renouvellement!.date)}
                            </Badge>
                          ) : (
                            <div className="shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                icon="autorenew"
                                loading={renouvellementEnCours === cleAction}
                                onClick={() => handleRenouveler(p.id, index, ligne.medicament)}
                              >
                                Renouveler
                              </Button>
                              {erreurParLigne[cleAction] && (
                                <p className="text-caption mt-1" style={{ color: "var(--color-error)" }}>
                                  {erreurParLigne[cleAction]}
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </li>
                    );
                  })}
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
            );
          })}
        </ul>
      )}
    </Card>
  );
}

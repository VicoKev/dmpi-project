// Carte des examens et documents médicaux (radiographies, scanners,
// résultats de laboratoire...) — espace médecin : permet de prescrire un
// nouvel examen et de déposer directement un résultat, en plus de la
// consultation en lecture (partagée avec l'espace patient via GalerieDocuments).
import { useCallback, useEffect, useState } from "react";
import Card, { CardHeader } from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import GalerieDocuments from "../document/GalerieDocuments";
import PrescrireExamenForm from "../document/PrescrireExamenForm";
import UploadDocumentForm from "../document/UploadDocumentForm";
import { getDemandesExamenPatient, type DemandeExamen } from "../../services/demandeExamenService";
import { getDocumentsPatient, type DocumentMedical } from "../../services/documentMedicalService";
import { formatDateFr } from "../../services/patientService";

interface ExamensCardProps {
  npi: string;
}

export default function ExamensCard({ npi }: ExamensCardProps) {
  const [demandes, setDemandes] = useState<DemandeExamen[]>([]);
  const [documents, setDocuments] = useState<DocumentMedical[]>([]);
  const [loading, setLoading] = useState(true);
  const [afficherPrescription, setAfficherPrescription] = useState(false);
  const [demandeAUploader, setDemandeAUploader] = useState<DemandeExamen | "libre" | null>(null);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [demandesData, documentsData] = await Promise.all([
        getDemandesExamenPatient(npi),
        getDocumentsPatient(npi),
      ]);
      setDemandes(demandesData);
      setDocuments(documentsData);
    } catch {
      // Échec silencieux — la carte affiche simplement une liste vide.
    } finally {
      setLoading(false);
    }
  }, [npi]);

  useEffect(() => { charger(); }, [charger]);

  const demandesEnAttente = demandes.filter((d) => d.statut === "en_attente");

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <CardHeader icon="biotech" title="Examens & documents médicaux" />
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon="upload" onClick={() => setDemandeAUploader("libre")}>
            Déposer un document
          </Button>
          <Button size="sm" icon="add" onClick={() => setAfficherPrescription(true)}>
            Prescrire un examen
          </Button>
        </div>
      </div>

      {demandesEnAttente.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          <p className="text-label-bold uppercase tracking-wide" style={{ color: "var(--color-on-surface-variant)" }}>
            Examens prescrits, en attente de résultat
          </p>
          {demandesEnAttente.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl"
              style={{ backgroundColor: d.probleme_signale ? "var(--color-error-container)" : "var(--color-warning-container)" }}
            >
              <div>
                <p
                  className="text-body-md font-semibold"
                  style={{ color: d.probleme_signale ? "var(--color-on-error-container)" : "var(--color-on-warning-container)" }}
                >
                  {d.type_examen}
                </p>
                <p className="text-caption" style={{ color: d.probleme_signale ? "var(--color-on-error-container)" : "var(--color-on-warning-container)" }}>
                  {d.prestataire_nom ?? "Laboratoire"} · prescrit le {formatDateFr(d.created_at)}
                </p>
                {d.probleme_signale && (
                  <p className="text-caption font-semibold" style={{ color: "var(--color-on-error-container)" }}>
                    ⚠ {d.motif_probleme || "Problème signalé par le laboratoire"}
                  </p>
                )}
              </div>
              <Badge variant={d.probleme_signale ? "error" : "warning"} icon={d.probleme_signale ? "report" : undefined}>
                {d.probleme_signale ? "Problème" : "En attente"}
              </Badge>
              <Button variant="outline" size="sm" icon="upload" onClick={() => setDemandeAUploader(d)}>
                Déposer le résultat
              </Button>
            </div>
          ))}
        </div>
      )}

      <GalerieDocuments documents={documents} loading={loading} onChanged={charger} />

      {afficherPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--color-surface)" }}>
            <h2 className="text-headline-sm font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>Prescrire un examen</h2>
            <PrescrireExamenForm
              npi={npi}
              onCreated={() => { setAfficherPrescription(false); charger(); }}
              onCancel={() => setAfficherPrescription(false)}
            />
          </div>
        </div>
      )}

      {demandeAUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--color-surface)" }}>
            <h2 className="text-headline-sm font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>
              {demandeAUploader === "libre" ? "Déposer un document" : "Déposer le résultat"}
            </h2>
            <UploadDocumentForm
              npi={npi}
              demandeExamenId={demandeAUploader === "libre" ? null : demandeAUploader.id}
              libelleParDefaut={demandeAUploader === "libre" ? "" : demandeAUploader.type_examen}
              onUploaded={() => { setDemandeAUploader(null); charger(); }}
              onCancel={() => setDemandeAUploader(null)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

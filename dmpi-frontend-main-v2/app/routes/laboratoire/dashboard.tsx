// Tableau de bord — Espace Laboratoire partenaire
// Écran unique et volontairement minimal : la file des demandes d'examen
// adressées à ce laboratoire, et le dépôt du résultat pour chacune.
import { useCallback, useEffect, useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Textarea from "../../components/ui/Textarea";
import UploadDocumentForm from "../../components/document/UploadDocumentForm";
import { useToast } from "../../contexts/ToastContext";
import {
  getMesDemandesLaboratoire,
  signalerProblemeExamen,
  type DemandeExamen,
} from "../../services/demandeExamenService";
import { formatDateFr } from "../../services/patientService";

const REFRESH_MS = 30_000;

function LigneEnAttente({
  demande: d,
  onUploader,
  onProblemeSignale,
}: {
  demande: DemandeExamen;
  onUploader: () => void;
  onProblemeSignale: (motif?: string) => Promise<void>;
}) {
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const confirmer = async () => {
    setEnvoiEnCours(true);
    try {
      await onProblemeSignale(motif);
      setFormulaireOuvert(false);
      setMotif("");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{d.type_examen}</p>
          <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
            Patient NPI {d.npi} · prescrit le {formatDateFr(d.created_at)} par {d.medecin_email}
          </p>
          {d.motif && (
            <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Motif : {d.motif}</p>
          )}
          {d.probleme_signale && (
            <p className="text-caption font-semibold mt-1" style={{ color: "var(--color-error)" }}>
              ⚠ Problème signalé{d.motif_probleme ? ` — ${d.motif_probleme}` : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {!d.probleme_signale && !formulaireOuvert && (
            <Button variant="outline" size="sm" icon="report" onClick={() => setFormulaireOuvert(true)}>
              Signaler un problème
            </Button>
          )}
          <Button size="sm" icon="upload" onClick={onUploader}>Déposer le résultat</Button>
        </div>
      </div>

      {formulaireOuvert && (
        <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
          <Textarea
            placeholder="Motif (optionnel) : échantillon rejeté, patient non présenté…"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" disabled={envoiEnCours} onClick={() => setFormulaireOuvert(false)}>
              Annuler
            </Button>
            <Button variant="danger" size="sm" icon="report" loading={envoiEnCours} onClick={confirmer}>
              Signaler
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function LaboratoireDashboard() {
  const [demandes, setDemandes] = useState<DemandeExamen[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandeAUploader, setDemandeAUploader] = useState<DemandeExamen | null>(null);
  const showToast = useToast();

  const charger = useCallback(async () => {
    try {
      setDemandes(await getMesDemandesLaboratoire());
    } catch {
      // Échec silencieux : nouvelle tentative au prochain cycle de rafraîchissement.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, REFRESH_MS);
    return () => clearInterval(interval);
  }, [charger]);

  const handleProblemeSignale = async (demandeId: string, motif?: string) => {
    try {
      await signalerProblemeExamen(demandeId, motif);
      await charger();
    } catch (err) {
      showToast((err as Error).message || "Erreur lors du signalement.", "error");
    }
  };

  const enAttente = demandes.filter((d) => d.statut === "en_attente");
  const traitees = demandes.filter((d) => d.statut === "traitee");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>Demandes d'examen</h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Examens prescrits par les médecins et adressés à votre laboratoire.
        </p>
      </div>

      <Card accentBorder="border-t-4 border-[var(--color-primary)]">
        <CardHeader icon="pending_actions" title={`En attente de résultat (${enAttente.length})`} />
        {loading ? (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Chargement…</p>
        ) : enAttente.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-[40px] opacity-40">task_alt</span>
            <p className="text-body-md">Aucune demande en attente pour le moment.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {enAttente.map((d) => (
              <LigneEnAttente
                key={d.id}
                demande={d}
                onUploader={() => setDemandeAUploader(d)}
                onProblemeSignale={(motif) => handleProblemeSignale(d.id, motif)}
              />
            ))}
          </ul>
        )}
      </Card>

      {traitees.length > 0 && (
        <Card>
          <CardHeader icon="task_alt" title={`Traitées récemment (${traitees.length})`} />
          <ul className="flex flex-col gap-2">
            {traitees.slice(0, 10).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                <div>
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{d.type_examen}</p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Patient NPI {d.npi}</p>
                </div>
                <Badge variant="success">Traitée</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {demandeAUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--color-surface)" }}>
            <h2 className="text-headline-sm font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>Déposer le résultat</h2>
            <UploadDocumentForm
              npi={demandeAUploader.npi}
              demandeExamenId={demandeAUploader.id}
              libelleParDefaut={demandeAUploader.type_examen}
              onUploaded={() => { setDemandeAUploader(null); charger(); }}
              onCancel={() => setDemandeAUploader(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

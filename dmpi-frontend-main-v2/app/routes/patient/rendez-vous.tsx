// Mes Rendez-vous — Espace Patient
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import Textarea from "../../components/ui/Textarea";
import Pagination from "../../components/ui/Pagination";
import { useListePaginee } from "../../hooks/useListePaginee";
import {
  getRdvAVenirPatient,
  getRdvPassesPatientPaginee,
  confirmerPresence,
  signalerEmpechement,
  formatRdvTime,
  type RendezVous,
} from "../../services/rdvService";

const TAILLE_PAGE = 10;

const STATUT_CONFIG = {
  confirme: { label: "Confirmé", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  annule: { label: "Annulé", color: "var(--color-error)", bg: "var(--color-error-container)", icon: "cancel" },
  complete: { label: "Effectué", color: "var(--color-outline)", bg: "var(--color-surface-container)", icon: "task_alt" },
};

const CONFIRMATION_CONFIG = {
  en_attente: { label: "En attente de votre réponse", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "hourglass_empty" },
  confirme: { label: "Vous avez confirmé", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  empechement: { label: "Empêchement signalé", color: "var(--color-on-error-container)", bg: "var(--color-error-container)", icon: "report" },
};

function RdvCard({ rdv, passe, onChanged }: { rdv: RendezVous; passe: boolean; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [signalerOuvert, setSignalerOuvert] = useState(false);
  const [messageEmpechement, setMessageEmpechement] = useState("");
  const cfg = STATUT_CONFIG[rdv.statut];
  const confirmationCfg = CONFIRMATION_CONFIG[rdv.confirmation_patient];
  const peutRepondre = !passe && rdv.statut === "confirme";

  const handleConfirmer = async () => {
    setConfirming(true);
    try {
      await confirmerPresence(rdv._id);
      onChanged();
    } finally {
      setConfirming(false);
    }
  };

  const handleSignaler = async () => {
    setDeclining(true);
    try {
      await signalerEmpechement(rdv._id, messageEmpechement);
      setSignalerOuvert(false);
      setMessageEmpechement("");
      onChanged();
    } finally {
      setDeclining(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col items-start sm:flex-row gap-3 sm:gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0 w-full sm:w-auto">
          {/* Icône date */}
          <div
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0 text-center"
            style={{
              backgroundColor: passe ? "var(--color-surface-container)" : "var(--color-primary-container)",
              color: passe ? "var(--color-outline)" : "var(--color-on-primary-container)",
            }}
          >
            <span className="text-headline-sm leading-none font-bold">
              {new Date(rdv.date_rdv).getDate()}
            </span>
            <span className="text-caption leading-none">
              {new Date(rdv.date_rdv).toLocaleDateString("fr-FR", { month: "short" })}
            </span>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
              {rdv.motif}
            </p>
            <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
              {formatRdvTime(rdv.date_rdv)} ({rdv.duree_minutes ?? 30} min) · {rdv.medecin_nom}
            </p>
            {rdv.notes && (
              <p className="text-caption mt-1 italic" style={{ color: "var(--color-on-surface-variant)" }}>
                {rdv.notes}
              </p>
            )}
          </div>
        </div>

        {/* Badge statut — masqué pour "confirmé" : redondant avec le badge de
            reconnaissance du patient affiché plus bas, sans information propre. */}
        {rdv.statut !== "confirme" && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            <span className="material-symbols-outlined filled text-[16px]">{cfg.icon}</span>
            <span className="text-caption font-semibold">{cfg.label}</span>
          </div>
        )}
      </div>

      {peutRepondre && (
        <div className="mt-3 pt-3 border-t flex flex-col gap-2.5" style={{ borderColor: "var(--color-outline-variant)" }}>
          <div
            className="flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-full"
            style={{ backgroundColor: confirmationCfg.bg, color: confirmationCfg.color }}
          >
            <span className="material-symbols-outlined text-[14px]">{confirmationCfg.icon}</span>
            <span className="text-caption font-semibold">{confirmationCfg.label}</span>
          </div>

          {rdv.confirmation_patient === "en_attente" && !signalerOuvert && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="primary" size="sm" icon="check_circle" loading={confirming} onClick={handleConfirmer}>
                Confirmer ma présence
              </Button>
              <Button variant="outline" size="sm" icon="report" onClick={() => setSignalerOuvert(true)}>
                Signaler un empêchement
              </Button>
            </div>
          )}
          {/* Un empêchement peut survenir après coup — l'action doit rester
              possible même une fois la présence confirmée, sinon le médecin
              continue de compter sur une venue qui n'aura plus lieu. */}
          {rdv.confirmation_patient === "confirme" && !signalerOuvert && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" icon="report" onClick={() => setSignalerOuvert(true)}>
                Signaler un empêchement
              </Button>
            </div>
          )}
          {signalerOuvert && (
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Précisez si possible (ex : « Je vous recontacte demain » ou « Merci de reprogrammer »)…"
                value={messageEmpechement}
                onChange={(e) => setMessageEmpechement(e.target.value)}
                rows={2}
                maxLength={280}
              />
              <div className="flex gap-2 flex-wrap justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={declining}
                  onClick={() => { setSignalerOuvert(false); setMessageEmpechement(""); }}
                >
                  Annuler
                </Button>
                <Button variant="danger" size="sm" icon="report" loading={declining} onClick={handleSignaler}>
                  Signaler l'empêchement
                </Button>
              </div>
            </div>
          )}
          {rdv.confirmation_patient === "empechement" && (
            <div className="flex flex-col gap-2.5">
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                Votre médecin a été informé — il pourrait vous recontacter pour reprogrammer.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" icon="check_circle" loading={confirming} onClick={handleConfirmer}>
                  Je suis de nouveau disponible
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function PatientRendezVous() {
  const { user } = useAuth();
  const npi = user?.patientNpi;
  const [aVenir, setAVenir] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);

  const chargerAVenir = useCallback(() => {
    if (!npi) { setLoading(false); return; }
    getRdvAVenirPatient(npi).then((res) => { setAVenir(res); setLoading(false); });
  }, [npi]);

  useEffect(() => { chargerAVenir(); }, [chargerAVenir]);

  const {
    items: passes,
    total: totalPasses,
    page: pagePasses,
    setPage: setPagePasses,
    totalPages: totalPagesPasses,
    reload: rechargerPasses,
  } = useListePaginee<RendezVous>(
    (skip, limit) => getRdvPassesPatientPaginee(npi!, skip, limit),
    { taillePage: TAILLE_PAGE, active: !!npi, deps: [npi] }
  );

  const charger = () => {
    chargerAVenir();
    rechargerPasses();
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes rendez-vous
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Vos prochains rendez-vous médicaux planifiés et votre historique.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Chargement de vos rendez-vous…" />
        </div>
      ) : aVenir.length === 0 && passes.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--color-outline)" }}>
              calendar_month
            </span>
            <p className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
              Aucun rendez-vous planifié
            </p>
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Votre médecin peut planifier un rendez-vous pour vous depuis son espace.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* À venir */}
          {aVenir.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined filled text-[20px]" style={{ color: "var(--color-primary)" }}>
                  upcoming
                </span>
                <h2 className="text-subheading" style={{ color: "var(--color-on-surface)" }}>
                  À venir ({aVenir.length})
                </h2>
              </div>
              {aVenir.map((r) => (
                <RdvCard key={r._id} rdv={r} passe={false} onChanged={charger} />
              ))}
            </div>
          )}

          {/* Passés / annulés */}
          {passes.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-outline)" }}>
                  history
                </span>
                <h2 className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
                  Historique ({totalPasses ?? passes.length})
                </h2>
              </div>
              {passes.map((r) => (
                <RdvCard key={r._id} rdv={r} passe={true} onChanged={charger} />
              ))}
              <Pagination page={pagePasses} totalPages={totalPagesPasses} onPageChange={setPagePasses} totalItems={totalPasses} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

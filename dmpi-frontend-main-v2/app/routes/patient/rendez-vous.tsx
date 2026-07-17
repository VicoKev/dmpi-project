// Mes Rendez-vous — Espace Patient
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import {
  getRdvByPatient,
  isRdvPasse,
  formatRdvDate,
  formatRdvTime,
  type RendezVous,
} from "../../services/rdvService";

const STATUT_CONFIG = {
  confirme: { label: "Confirmé", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  annule: { label: "Annulé", color: "var(--color-error)", bg: "var(--color-error-container)", icon: "cancel" },
  complete: { label: "Effectué", color: "var(--color-outline)", bg: "var(--color-surface-container)", icon: "task_alt" },
};

function RdvCard({ rdv, passe }: { rdv: RendezVous; passe: boolean }) {
  const cfg = STATUT_CONFIG[rdv.statut];
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
              {formatRdvTime(rdv.date_rdv)} · {rdv.medecin_nom}
            </p>
            {rdv.notes && (
              <p className="text-caption mt-1 italic" style={{ color: "var(--color-on-surface-variant)" }}>
                {rdv.notes}
              </p>
            )}
          </div>
        </div>

        {/* Badge statut */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          <span className="material-symbols-outlined filled text-[16px]">{cfg.icon}</span>
          <span className="text-caption font-semibold">{cfg.label}</span>
        </div>
      </div>
    </Card>
  );
}

export default function PatientRendezVous() {
  const { user } = useAuth();
  const npi = user?.patientNpi;
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!npi) { setLoading(false); return; }
    let cancelled = false;
    getRdvByPatient(npi).then((res) => {
      if (!cancelled) { setRdvs(res); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [npi]);

  const aVenir = rdvs.filter((r) => !isRdvPasse(r) && r.statut === "confirme");
  const passes = rdvs.filter((r) => isRdvPasse(r) || r.statut !== "confirme");

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
      ) : rdvs.length === 0 ? (
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
                <RdvCard key={r._id} rdv={r} passe={false} />
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
                  Historique ({passes.length})
                </h2>
              </div>
              {passes.map((r) => (
                <RdvCard key={r._id} rdv={r} passe={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

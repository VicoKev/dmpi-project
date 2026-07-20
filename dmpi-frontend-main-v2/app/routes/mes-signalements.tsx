// Mes signalements de correction — partagé entre tous les rôles
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Card, { CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { getMesSignalementsCorrection, type SignalementCorrection } from "../services/authService";

const STATUT_CONFIG: Record<SignalementCorrection["statut"], { label: string; color: string; bg: string; icon: string }> = {
  en_attente: { label: "En attente", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "hourglass_empty" },
  traitee: { label: "Traité", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
};

export default function MesSignalements() {
  const navigate = useNavigate();
  const [signalements, setSignalements] = useState<SignalementCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMesSignalementsCorrection()
      .then((res) => { if (!cancelled) setSignalements(res); })
      .catch((err) => { if (!cancelled) setError((err as Error).message || "Impossible de charger vos signalements."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Mes signalements
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Erreurs signalées sur vos propres informations de compte, et leur suivi par le Super Administrateur national.
          </p>
        </div>
        <Button variant="ghost" icon="arrow_back" onClick={() => navigate(-1)}>Retour</Button>
      </div>

      <Card>
        <CardHeader icon="edit_note" title="Historique" />

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Chargement…" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            {error}
          </div>
        ) : signalements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-5xl opacity-40">edit_note</span>
            <p className="text-body-md">Vous n'avez signalé aucune erreur sur votre compte.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {signalements.map((s) => {
              const cfg = STATUT_CONFIG[s.statut];
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 p-4 rounded-xl"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body-md" style={{ color: "var(--color-on-surface)" }}>{s.motif}</p>
                    <span
                      className="text-caption font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    Signalé le {new Date(s.date_creation).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {s.statut === "traitee" && s.date_traitement && (
                      <> · Traité le {new Date(s.date_traitement).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

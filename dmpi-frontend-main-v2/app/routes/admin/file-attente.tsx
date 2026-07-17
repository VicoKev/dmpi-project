// Supervision de la file d'attente — Espace Admin Établissement (lecture seule)
import { useState, useEffect, useCallback } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import { getFileAttenteEtablissement, type EntreeFileAttente } from "../../services/fileAttenteService";

const REFRESH_MS = 30_000;

const PRIORITE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normale: { label: "Normale", color: "var(--color-on-surface-variant)", bg: "var(--color-surface-container)" },
  urgente: { label: "Urgente", color: "var(--color-on-error-container)", bg: "var(--color-error-container)" },
};

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  en_attente: { label: "À assigner", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "hourglass_empty" },
  assigne: { label: "Assigné", color: "var(--color-on-primary-container)", bg: "var(--color-primary-container)", icon: "assignment_ind" },
  en_consultation: { label: "En consultation", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "medical_services" },
};

export default function AdminFileAttente() {
  const [entrees, setEntrees] = useState<EntreeFileAttente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setEntrees(await getFileAttenteEtablissement());
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Impossible de charger la file d'attente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, REFRESH_MS);
    return () => clearInterval(interval);
  }, [charger]);

  const enAttente = entrees.filter((e) => e.statut === "en_attente").length;
  const enCours = entrees.filter((e) => e.statut === "assigne" || e.statut === "en_consultation").length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          File d'attente
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Supervision en lecture seule de la file de pré-consultation de votre établissement — l'assignation et la prise en charge restent gérées par les infirmiers et médecins.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: "hourglass_empty", label: "À assigner", value: enAttente, color: "var(--color-on-warning-container)" },
          { icon: "medical_services", label: "En cours de prise en charge", value: enCours, color: "var(--color-primary)" },
          { icon: "groups", label: "Total dans la file", value: entrees.length, color: "var(--color-secondary)" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col gap-2 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
            <span className="material-symbols-outlined filled text-[20px]" style={{ color: s.color }}>{s.icon}</span>
            <p className="text-headline-sm font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader icon="groups" title={`File actuelle (${entrees.length})`} />
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
            <button className="ml-auto underline text-body-md" onClick={charger}>Réessayer</button>
          </div>
        ) : entrees.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-5xl opacity-40">event_available</span>
            <p className="text-body-md">Aucun patient en attente actuellement.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {entrees.map((e) => {
              const statutCfg = STATUT_CONFIG[e.statut] ?? STATUT_CONFIG.en_attente;
              const prioriteCfg = PRIORITE_CONFIG[e.priorite] ?? PRIORITE_CONFIG.normale;
              return (
                <li key={e.id} className="flex flex-col gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        {e.prenom} {e.nom}
                        <span className="text-caption font-normal ml-2" style={{ color: "var(--color-on-surface-variant)" }}>
                          NPI {e.npi}
                        </span>
                      </p>
                      <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>{e.motif_bref}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-caption font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: prioriteCfg.bg, color: prioriteCfg.color }}>
                        {prioriteCfg.label}
                      </span>
                      <span className="text-caption font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: statutCfg.bg, color: statutCfg.color }}>
                        <span className="material-symbols-outlined text-[13px]">{statutCfg.icon}</span>
                        {statutCfg.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    Infirmier(e) : {e.infirmier_email}{e.medecin_email ? ` · Médecin : ${e.medecin_email}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-caption text-center" style={{ color: "var(--color-on-surface-variant)" }}>
        La liste se rafraîchit automatiquement toutes les 30 secondes.
      </p>
    </div>
  );
}

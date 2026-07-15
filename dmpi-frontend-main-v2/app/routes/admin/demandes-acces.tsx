// Demandes d'accès portail patient — Espace Admin Établissement (lecture seule)
import { useState, useEffect, useCallback } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import { getDemandesAccesMonEtablissement, type DemandeAcces } from "../../services/demandeAccesService";

const STATUT_CONFIG: Record<DemandeAcces["statut"], { label: string; color: string; bg: string }> = {
  en_attente: { label: "En attente", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)" },
  traite: { label: "Compte créé", color: "var(--color-on-success-container)", bg: "var(--color-success-container)" },
  rejete: { label: "Rejetée", color: "var(--color-on-error-container)", bg: "var(--color-error-container)" },
  annulee: { label: "Annulée", color: "var(--color-on-surface-variant)", bg: "var(--color-surface-container)" },
};

export default function AdminDemandesAcces() {
  const [demandes, setDemandes] = useState<DemandeAcces[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDemandes(await getDemandesAccesMonEtablissement());
    } catch (err) {
      setError((err as Error).message || "Impossible de charger les demandes d'accès.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Demandes d'accès patient
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Demandes d'accès portail émises par le personnel de votre établissement — vue de supervision.
          La création ou le rejet du compte reste géré par le Super Administrateur national.
        </p>
      </div>

      <Card>
        <CardHeader icon="how_to_reg" title={`${demandes.length} demande(s)`} />

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
            <button className="ml-auto underline text-body-md" onClick={load}>Réessayer</button>
          </div>
        ) : demandes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-5xl opacity-40">task_alt</span>
            <p className="text-body-md">Aucune demande d'accès émise par votre établissement.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {demandes.map((d) => {
              const cfg = STATUT_CONFIG[d.statut];
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {d.prenom} {d.nom}
                      <span className="text-caption font-normal ml-2" style={{ color: "var(--color-on-surface-variant)" }}>
                        NPI {d.npi}
                      </span>
                    </p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      Contact {d.telephone_contact} · Demandé par {d.demandeur_email} le{" "}
                      {new Date(d.date_creation).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {d.statut === "rejete" && d.motif_rejet && (
                      <p className="text-caption mt-1" style={{ color: "var(--color-error)" }}>Motif du rejet : {d.motif_rejet}</p>
                    )}
                  </div>
                  <span className="text-caption font-semibold px-3 py-1 rounded-full shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

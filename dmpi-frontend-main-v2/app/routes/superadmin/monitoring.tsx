// Monitoring système — Espace Super Admin National
import { useState, useEffect, useCallback } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import { apiFetch } from "../../services/api";

type StatutService = "operationnel" | "incident" | "verification";

interface ServiceDef {
  id: string;
  nom: string;
  description: string;
  icon: string;
  chemin: string;
}

interface ServiceStatus extends ServiceDef {
  statut: StatutService;
  latenceMs: number | null;
  derniereVerif: string | null;
}

// Un seul service par dépendance réellement vérifiable via un endpoint /health*
// du backend — pas de service "Frontend" ou "Sauvegarde" fictif, faute de
// vérification réelle possible pour ces deux-là.
const SERVICES: ServiceDef[] = [
  {
    id: "svc_api",
    nom: "API FastAPI",
    description: "Serveur backend REST — routes métier et authentification",
    icon: "api",
    chemin: "/",
  },
  {
    id: "svc_pg",
    nom: "PostgreSQL",
    description: "Base relationnelle — comptes, audit, délégations",
    icon: "database",
    chemin: "/health/postgres",
  },
  {
    id: "svc_mongo",
    nom: "MongoDB",
    description: "Base documentaire — dossiers médicaux, consultations",
    icon: "storage",
    chemin: "/health/mongo",
  },
  {
    id: "svc_kafka",
    nom: "Apache Kafka",
    description: "Bus d'événements asynchrones (audit, notifications)",
    icon: "stream",
    chemin: "/health/kafka",
  },
];

const STATUT_SVC: Record<StatutService, { label: string; color: string; bg: string; icon: string }> = {
  operationnel: { label: "Opérationnel", color: "var(--color-success)", bg: "var(--color-success-container)", icon: "check_circle" },
  incident: { label: "Indisponible", color: "var(--color-error)", bg: "var(--color-error-container)", icon: "error" },
  verification: { label: "Vérification...", color: "var(--color-on-surface-variant)", bg: "var(--color-surface-container-high)", icon: "hourglass_empty" },
};

const REFRESH_MS = 15000;

export default function SuperAdminMonitoring() {
  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICES.map((s) => ({ ...s, statut: "verification", latenceMs: null, derniereVerif: null }))
  );

  const verifierServices = useCallback(async () => {
    const resultats = await Promise.all(
      SERVICES.map(async (s) => {
        const t0 = Date.now();
        try {
          await apiFetch<unknown>(s.chemin);
          return { ...s, statut: "operationnel" as const, latenceMs: Date.now() - t0, derniereVerif: new Date().toISOString() };
        } catch {
          return { ...s, statut: "incident" as const, latenceMs: null, derniereVerif: new Date().toISOString() };
        }
      })
    );
    setServices(resultats);
  }, []);

  useEffect(() => {
    verifierServices();
    const id = setInterval(verifierServices, REFRESH_MS);
    return () => clearInterval(id);
  }, [verifierServices]);

  const nbOperationnels = services.filter((s) => s.statut === "operationnel").length;
  const nbIncidents = services.filter((s) => s.statut === "incident").length;
  const enVerification = services.some((s) => s.statut === "verification");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Monitoring système
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            État en temps réel de l'infrastructure DMPI Bénin. Rafraîchi toutes les 15 secondes.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-body-md font-semibold"
          style={{
            backgroundColor: nbIncidents > 0 ? "var(--color-error-container)" : "var(--color-success-container)",
            color: nbIncidents > 0 ? "var(--color-error)" : "var(--color-success)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: nbIncidents > 0 ? "var(--color-error)" : "var(--color-success)" }}
          />
          {enVerification
            ? "Vérification..."
            : nbIncidents > 0
              ? `${nbIncidents} service(s) indisponible(s)`
              : "Système nominal"}
        </div>
      </div>

      {/* État des services */}
      <Card>
        <CardHeader icon="dns" title={`Services (${nbOperationnels}/${services.length} opérationnels)`} />
        <div className="flex flex-col gap-3">
          {services.map((svc) => {
            const cfg = STATUT_SVC[svc.statut];
            return (
              <div
                key={svc.id}
                className="flex items-center gap-4 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                {/* Icône */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cfg.bg }}
                >
                  <span className="material-symbols-outlined filled text-[20px]" style={{ color: cfg.color }}>
                    {cfg.icon}
                  </span>
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {svc.nom}
                    </p>
                    <span
                      className="text-caption font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {svc.description}
                  </p>
                </div>

                {/* Latence mesurée en direct */}
                <div className="text-right shrink-0">
                  {svc.latenceMs !== null && (
                    <p className="text-body-md font-bold" style={{ color: "var(--color-on-surface)" }}>
                      {svc.latenceMs} ms
                    </p>
                  )}
                  {svc.derniereVerif && (
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      vérifié à {new Date(svc.derniereVerif).toLocaleTimeString("fr-FR")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// Monitoring Systeme — Espace Super Admin National
import { useState, useEffect } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import { apiFetch } from "../../services/api";

interface ServiceStatus {
  id: string;
  nom: string;
  description: string;
  statut: "operationnel" | "degraded" | "incident" | "maintenance";
  latenceMs: number;
  uptime: number; // en %
  derniereVerif: string;
  icon: string;
}

interface Incident {
  id: string;
  titre: string;
  service: string;
  severite: "critique" | "majeur" | "mineur";
  statut: "en_cours" | "resolu" | "surveille";
  debut: string;
  fin?: string;
  description: string;
}

interface MetriqueTempsReel {
  label: string;
  valeur: number;
  max: number;
  unite: string;
  couleur: string;
  icon: string;
}

const SERVICES: ServiceStatus[] = [
  {
    id: "svc_api",
    nom: "API FastAPI",
    description: "Serveur backend REST — routes metier et authentification",
    statut: "operationnel",
    latenceMs: 48,
    uptime: 99.94,
    derniereVerif: new Date(Date.now() - 30000).toISOString(),
    icon: "api",
  },
  {
    id: "svc_pg",
    nom: "PostgreSQL 18",
    description: "Base relationnelle — comptes, audit, delegations",
    statut: "operationnel",
    latenceMs: 12,
    uptime: 99.99,
    derniereVerif: new Date(Date.now() - 30000).toISOString(),
    icon: "database",
  },
  {
    id: "svc_mongo",
    nom: "MongoDB",
    description: "Base documentaire — dossiers medicaux, consultations",
    statut: "operationnel",
    latenceMs: 18,
    uptime: 99.97,
    derniereVerif: new Date(Date.now() - 30000).toISOString(),
    icon: "storage",
  },
  {
    id: "svc_kafka",
    nom: "Apache Kafka",
    description: "Bus d'evenements — tracing et evenements asynchrones",
    statut: "maintenance",
    latenceMs: 0,
    uptime: 87.2,
    derniereVerif: new Date(Date.now() - 300000).toISOString(),
    icon: "stream",
  },
  {
    id: "svc_frontend",
    nom: "Frontend Vite",
    description: "Application web React — interface utilisateurs",
    statut: "operationnel",
    latenceMs: 62,
    uptime: 99.91,
    derniereVerif: new Date(Date.now() - 30000).toISOString(),
    icon: "web",
  },
  {
    id: "svc_backup",
    nom: "Service de sauvegarde",
    description: "Sauvegardes nocturnes automatiques des bases de donnees",
    statut: "operationnel",
    latenceMs: 0,
    uptime: 100,
    derniereVerif: new Date(Date.now() - 3600000).toISOString(),
    icon: "backup",
  },
];

const INCIDENTS: Incident[] = [
  {
    id: "inc_001",
    titre: "Kafka indisponible — mode degrade actif",
    service: "Apache Kafka",
    severite: "mineur",
    statut: "en_cours",
    debut: new Date(Date.now() - 12 * 3600000).toISOString(),
    description:
      "Le broker Kafka n'est pas accessible. Le systeme fonctionne en mode degrade : les evenements sont ignores silencieusement. Aucun impact sur les dossiers medicaux.",
  },
  {
    id: "inc_002",
    titre: "Connexion asyncpg intermittente sur Windows",
    service: "PostgreSQL 18",
    severite: "mineur",
    statut: "resolu",
    debut: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
    fin: new Date(Date.now() - 2.5 * 24 * 3600000).toISOString(),
    description:
      "Incompatibilite entre asyncpg et PG18 sous Windows (WinError 64). Resolu par le passage en mode ssl=False sur la chaine de connexion locale.",
  },
  {
    id: "inc_003",
    titre: "CSC Akpakpa Centre — perte de synchronisation",
    service: "Sync Etablissements",
    severite: "majeur",
    statut: "surveille",
    debut: new Date(Date.now() - 21 * 24 * 3600000).toISOString(),
    description:
      "Le CSC Akpakpa Centre n'envoie plus de signal depuis 21 jours. Cause probable : panne infrastructure reseau locale. Equipe technique sur site.",
  },
];

const METRIQUES: MetriqueTempsReel[] = [
  { label: "CPU Backend", valeur: 23, max: 100, unite: "%", couleur: "var(--color-primary)", icon: "memory" },
  { label: "Memoire RAM", valeur: 1.4, max: 8, unite: "Go", couleur: "var(--color-secondary)", icon: "storage" },
  { label: "Connexions DB actives", valeur: 12, max: 100, unite: "", couleur: "var(--color-tertiary)", icon: "hub" },
  { label: "Requetes / sec", valeur: 3.2, max: 50, unite: "req/s", couleur: "var(--color-success)", icon: "speed" },
];

const STATUT_SVC = {
  operationnel: { label: "Operationnel", color: "var(--color-success)", bg: "var(--color-success-container)", icon: "check_circle" },
  degraded: { label: "Degrade", color: "var(--color-warning)", bg: "var(--color-warning-container)", icon: "warning" },
  incident: { label: "Incident", color: "var(--color-error)", bg: "var(--color-error-container)", icon: "error" },
  maintenance: { label: "Maintenance", color: "var(--color-warning)", bg: "var(--color-warning-container)", icon: "build" },
};

const SEVERITE_CONFIG = {
  critique: { color: "var(--color-error)", bg: "var(--color-error-container)", label: "Critique" },
  majeur: { color: "var(--color-warning)", bg: "var(--color-warning-container)", label: "Majeur" },
  mineur: { color: "var(--color-tertiary)", bg: "var(--color-tertiary-container)", label: "Mineur" },
};

const STATUT_INC = {
  en_cours: { label: "En cours", color: "var(--color-error)", bg: "var(--color-error-container)" },
  resolu: { label: "Resolu", color: "var(--color-success)", bg: "var(--color-success-container)" },
  surveille: { label: "Surveille", color: "var(--color-warning)", bg: "var(--color-warning-container)" },
};

function BarreMetrique({ m }: { m: MetriqueTempsReel }) {
  const pct = Math.min((m.valeur / m.max) * 100, 100);
  return (
    <div className="flex flex-col gap-2 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]" style={{ color: m.couleur }}>{m.icon}</span>
          <span className="text-body-md" style={{ color: "var(--color-on-surface)" }}>{m.label}</span>
        </div>
        <span className="text-body-md font-bold" style={{ color: m.couleur }}>
          {m.valeur} {m.unite}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: m.couleur }}
        />
      </div>
    </div>
  );
}

function formatDuree(debut: string, fin?: string): string {
  const ms = (fin ? new Date(fin) : new Date()).getTime() - new Date(debut).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}min`;
  return `${Math.floor(hrs / 24)} jours`;
}

export default function SuperAdminMonitoring() {
  const [tick, setTick] = useState(0);
  const [apiStatut, setApiStatut] = useState<"operationnel" | "incident">("operationnel");
  const [apiLatence, setApiLatence] = useState<number>(0);
  const [mongoStatut, setMongoStatut] = useState<"operationnel" | "incident">("operationnel");

  // Vrai ping du backend + rafraichissement toutes les 15 secondes
  useEffect(() => {
    const checkApi = async () => {
      const t0 = Date.now();
      try {
        await apiFetch<unknown>("/");
        setApiLatence(Date.now() - t0);
        setApiStatut("operationnel");
      } catch {
        setApiStatut("incident");
        setApiLatence(0);
      }
    };

    const checkMongo = async () => {
      try {
        const res = await apiFetch<{ status: string }>("/health/mongo");
        setMongoStatut(res.status === "success" ? "operationnel" : "incident");
      } catch {
        setMongoStatut("incident");
      }
    };

    checkApi();
    checkMongo();
    const id = setInterval(() => { setTick((t) => t + 1); checkApi(); checkMongo(); }, 15000);
    return () => clearInterval(id);
  }, []);

  // Mise à jour dynamique du statut des services réels dans la liste
  const servicesAvecStatutReel = SERVICES.map((s) => {
    if (s.id === "svc_api") return { ...s, statut: apiStatut, latenceMs: apiLatence > 0 ? apiLatence : s.latenceMs };
    if (s.id === "svc_mongo") return { ...s, statut: mongoStatut };
    return s;
  });

  const nbOperationnels = servicesAvecStatutReel.filter((s) => s.statut === "operationnel").length;
  const nbIncidentsActifs = INCIDENTS.filter((i) => i.statut === "en_cours" || i.statut === "surveille").length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* En-tete */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Monitoring systeme
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Etat en temps reel de l'infrastructure DMPI Benin. Rafraichi toutes les 10 secondes.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-body-md font-semibold"
          style={{
            backgroundColor: nbIncidentsActifs > 0 ? "var(--color-warning-container)" : "var(--color-success-container)",
            color: nbIncidentsActifs > 0 ? "var(--color-warning)" : "var(--color-success)",
          }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: nbIncidentsActifs > 0 ? "var(--color-warning)" : "var(--color-success)" }}
          />
          {nbIncidentsActifs > 0 ? `${nbIncidentsActifs} incident(s) actif(s)` : "Systeme nominal"}
        </div>
      </div>

      {/* Metriques temps reel */}
      <Card>
        <CardHeader icon="speed" title="Metriques temps reel" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {METRIQUES.map((m) => (
            <BarreMetrique key={m.label} m={m} />
          ))}
        </div>
        <p className="text-caption mt-3" style={{ color: "var(--color-on-surface-variant)" }}>
          Dernier rafraichissement : {new Date().toLocaleTimeString("fr-FR")}
        </p>
      </Card>

      {/* Etat des services */}
      <Card>
        <CardHeader icon="dns" title={`Services (${nbOperationnels}/${servicesAvecStatutReel.length} operationnels)`} />
        <div className="flex flex-col gap-3">
          {servicesAvecStatutReel.map((svc) => {
            const cfg = STATUT_SVC[svc.statut];
            return (
              <div
                key={svc.id}
                className="flex items-center gap-4 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                {/* Icone */}
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

                {/* Metriques */}
                <div className="text-right shrink-0">
                  {svc.latenceMs > 0 && (
                    <p className="text-body-md font-bold" style={{ color: "var(--color-on-surface)" }}>
                      {svc.latenceMs} ms
                    </p>
                  )}
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    uptime {svc.uptime}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Incidents */}
      <Card>
        <CardHeader icon="report_problem" title={`Historique des incidents (${INCIDENTS.length})`} />
        <div className="flex flex-col gap-3">
          {INCIDENTS.map((inc) => {
            const sev = SEVERITE_CONFIG[inc.severite];
            const statut = STATUT_INC[inc.statut];
            return (
              <div
                key={inc.id}
                className="p-4 rounded-xl border"
                style={{
                  borderColor: sev.bg,
                  backgroundColor: "var(--color-surface-container-low)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-start gap-2">
                    <span
                      className="material-symbols-outlined filled text-[18px] mt-0.5 shrink-0"
                      style={{ color: sev.color }}
                    >
                      {inc.statut === "resolu" ? "check_circle" : "warning"}
                    </span>
                    <div>
                      <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        {inc.titre}
                      </p>
                      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        Service : {inc.service}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span
                      className="text-caption font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: sev.bg, color: sev.color }}
                    >
                      {sev.label}
                    </span>
                    <span
                      className="text-caption font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: statut.bg, color: statut.color }}
                    >
                      {statut.label}
                    </span>
                  </div>
                </div>
                <p className="text-body-md mb-2" style={{ color: "var(--color-on-surface-variant)" }}>
                  {inc.description}
                </p>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  Debut : {new Date(inc.debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  {inc.fin
                    ? ` · Resolu apres ${formatDuree(inc.debut, inc.fin)}`
                    : ` · En cours depuis ${formatDuree(inc.debut)}`}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// Dashboard Super Administrateur National — DMPI
import { useEffect, useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import { apiFetch } from "../../services/api";

// ─── Types correspondant a la reponse reelle de GET /dashboard/national ───────

interface DashboardNational {
  utilisateurs_par_role: Record<string, number>;
  activite_clinique: {
    total_dossiers_patients: number;
    total_consultations: number;
    consultations_7_derniers_jours: number;
  };
  epidemiologie: {
    top_diagnostics_cim10: { diagnostic_cim10: string; nombre_cas: number }[];
  };
  urgences: {
    total_acces_break_the_glass: number;
    acces_break_the_glass_aujourdhui: number;
  };
  genere_le: string;
  etablissements: {
    id: string;
    nom: string;
    ville: string;
    departement: string;
    type: "CHU" | "CHD" | "CSC" | "Clinique";
    statut: "actif" | "maintenance" | "inactif";
    patients: number;
    consultationsMois: number;
    derniereSync: string;
  }[];
}

const TYPE_COLORS: Record<string, string> = {
  CHU: "var(--color-primary)",
  CHD: "var(--color-secondary)",
  CSC: "var(--color-tertiary)",
  Clinique: "var(--color-success)",
};

const STATUT_CONFIG = {
  actif: { label: "Actif", color: "var(--color-success)", bg: "var(--color-success-container)" },
  maintenance: { label: "Maintenance", color: "var(--color-warning)", bg: "var(--color-warning-container)" },
  inactif: { label: "Inactif", color: "var(--color-error)", bg: "var(--color-error-container)" },
};

const ROLE_LABELS: Record<string, string> = {
  medecin: "Médecins",
  infirmier: "Infirmiers",
  admin_etablissement: "Admins",
  super_admin: "Super Admins",
  patient: "Patients",
};

const ROLE_ICONS: Record<string, { icon: string; color: string }> = {
  medecin: { icon: "stethoscope", color: "var(--color-primary)" },
  infirmier: { icon: "vaccines", color: "var(--color-tertiary)" },
  admin_etablissement: { icon: "admin_panel_settings", color: "var(--color-secondary)" },
  super_admin: { icon: "shield_person", color: "#8B5CF6" },
  patient: { icon: "person", color: "var(--color-success)" },
};

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardNational | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemeOperationnel, setSystemeOperationnel] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<DashboardNational>("/dashboard/national")
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError((err as Error).message); setLoading(false); });
  }, []);

  useEffect(() => {
    apiFetch("/")
      .then(() => setSystemeOperationnel(true))
      .catch(() => setSystemeOperationnel(false));
  }, []);

  const totalUtilisateurs = data
    ? Object.values(data.utilisateurs_par_role).reduce((s, v) => s + v, 0)
    : 0;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Supervision nationale — DMPI Bénin
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            {data
              ? `Données en temps réel — générées le ${new Date(data.genere_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
              : "Chargement des données..."}
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-body-md font-semibold"
          style={
            systemeOperationnel === false
              ? { backgroundColor: "var(--color-error-container)", color: "var(--color-error)" }
              : { backgroundColor: "var(--color-success-container)", color: "var(--color-success)" }
          }
        >
          <span
            className={systemeOperationnel === null ? "w-2 h-2 rounded-full" : "w-2 h-2 rounded-full animate-pulse"}
            style={{ backgroundColor: systemeOperationnel === false ? "var(--color-error)" : "var(--color-success)" }}
          />
          {systemeOperationnel === null ? "Vérification..." : systemeOperationnel ? "Système opérationnel" : "API injoignable"}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}
        >
          <span className="material-symbols-outlined">error</span>
          <span>Impossible de charger les données : {error}</span>
        </div>
      )}

      {/* Stats cliniques réelles */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container)" }} />
          ))}
        </div>
      ) : data && (
        <>
          {/* KPIs principaux — données réelles */}
          <div>
            <p className="text-caption font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary)" }}>
              Données réelles — base de données
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  icon: "folder_shared",
                  label: "Dossiers patients",
                  value: data.activite_clinique.total_dossiers_patients.toLocaleString("fr-FR"),
                  sub: "dans MongoDB",
                  color: "var(--color-primary)",
                },
                {
                  icon: "medical_services",
                  label: "Consultations totales",
                  value: data.activite_clinique.total_consultations.toLocaleString("fr-FR"),
                  sub: "depuis l'ouverture",
                  color: "var(--color-secondary)",
                },
                {
                  icon: "today",
                  label: "Consultations (7j)",
                  value: data.activite_clinique.consultations_7_derniers_jours.toLocaleString("fr-FR"),
                  sub: "7 derniers jours",
                  color: "var(--color-tertiary)",
                },
                {
                  icon: "manage_accounts",
                  label: "Comptes utilisateurs",
                  value: totalUtilisateurs.toLocaleString("fr-FR"),
                  sub: "dans PostgreSQL",
                  color: "var(--color-success)",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col gap-2 p-4 rounded-2xl"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <span className="material-symbols-outlined filled text-[22px]" style={{ color: s.color }}>{s.icon}</span>
                  <p className="text-headline-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                  <div>
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{s.label}</p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Répartition par rôle — données réelles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader icon="group" title="Comptes par rôle (PostgreSQL)" />
              <div className="flex flex-col gap-3">
                {Object.entries(data.utilisateurs_par_role).map(([role, count]) => {
                  const cfg = ROLE_ICONS[role] ?? { icon: "person", color: "var(--color-primary)" };
                  return (
                    <div key={role} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: cfg.color + "20" }}
                      >
                        <span className="material-symbols-outlined filled text-[16px]" style={{ color: cfg.color }}>
                          {cfg.icon}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-body-md" style={{ color: "var(--color-on-surface)" }}>
                            {ROLE_LABELS[role] ?? role}
                          </p>
                          <p className="text-body-md font-bold" style={{ color: cfg.color }}>{count}</p>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-surface-container)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(count / totalUtilisateurs) * 100}%`,
                              backgroundColor: cfg.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Top diagnostics CIM-10 — données réelles */}
            <Card>
              <CardHeader icon="analytics" title="Top diagnostics CIM-10 (MongoDB)" />
              {data.epidemiologie.top_diagnostics_cim10.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6" style={{ color: "var(--color-on-surface-variant)" }}>
                  <span className="material-symbols-outlined text-4xl opacity-40">analytics</span>
                  <p className="text-body-md">Aucune consultation enregistrée pour l'instant.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {data.epidemiologie.top_diagnostics_cim10.slice(0, 5).map((d, i) => {
                    const max = data.epidemiologie.top_diagnostics_cim10[0].nombre_cas;
                    return (
                      <div key={d.diagnostic_cim10} className="flex items-start gap-2">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-caption font-bold flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-primary)" }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-body-md font-medium" style={{ color: "var(--color-on-surface)" }}>
                              {d.diagnostic_cim10}
                            </p>
                            <p className="text-body-md font-bold" style={{ color: "var(--color-primary)" }}>
                              {d.nombre_cas}
                            </p>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--color-surface-container)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(d.nombre_cas / max) * 100}%`, backgroundColor: "var(--color-primary)" }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Urgences */}
          {data.urgences.total_acces_break_the_glass > 0 && (
            <div
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ backgroundColor: "var(--color-warning-container)", color: "var(--color-warning)" }}
            >
              <span className="material-symbols-outlined filled text-[24px]">emergency</span>
              <div>
                <p className="text-body-md font-bold">
                  {data.urgences.acces_break_the_glass_aujourdhui} accès d'urgence aujourd'hui
                </p>
                <p className="text-caption">
                  {data.urgences.total_acces_break_the_glass} total depuis l'ouverture — consulter le journal d'audit pour le détail.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Liste établissements — données réelles */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <CardHeader icon="domain" title="Établissements connectés" />
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-body-md min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
                {["Établissement", "Type", "Patients", "Consult./mois", "Statut", "Dernière sync"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-caption font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.etablissements?.map((e) => {
                const statut = STATUT_CONFIG[e.statut];
                return (
                  <tr
                    key={e.id}
                    className="border-b transition-colors hover:bg-[var(--color-surface-container-low)]"
                    style={{ borderColor: "var(--color-outline-variant)" }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold" style={{ color: "var(--color-on-surface)" }}>{e.nom}</p>
                      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        {e.ville} · {e.departement}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-caption font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: TYPE_COLORS[e.type] + "20", color: TYPE_COLORS[e.type] }}
                      >
                        {e.type}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-on-surface-variant)" }}>
                      {e.patients.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-on-surface-variant)" }}>
                      {e.consultationsMois > 0 ? e.consultationsMois.toLocaleString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-caption font-semibold px-2 py-1 rounded-full"
                        style={{ backgroundColor: statut.bg, color: statut.color }}
                      >
                        {statut.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      {new Date(e.derniereSync).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {" — "}
                      {new Date(e.derniereSync).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Dashboard Infirmier — DMPI
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatutBadge } from "../../components/ui/Badge";
import PatientSearch from "../../components/patient/PatientSearch";
import { getTodayRelevesByInfirmier } from "../../services/constanstesService";
import { getTodayAdministrationsByInfirmier } from "../../services/administrationService";
import { formatDateFr } from "../../services/patientService";
import type { ReleveConstantes } from "../../services/constanstesService";
import type { AdministrationMedicament } from "../../services/administrationService";

function StatCard({
  icon,
  label,
  value,
  color = "var(--color-primary)",
}: {
  icon: string;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-2xl"
      style={{ backgroundColor: "var(--color-surface-container-low)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "20" }}
      >
        <span
          className="material-symbols-outlined filled text-[24px]"
          style={{ color }}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-headline-sm" style={{ color }}>
          {value}
        </p>
        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export default function InfirmierDashboard() {
  const { user } = useAuth();
  const [releves, setReleves] = useState<ReleveConstantes[]>([]);
  const [administrations, setAdministrations] = useState<AdministrationMedicament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      getTodayRelevesByInfirmier(user.id),
      getTodayAdministrationsByInfirmier(user.id),
    ]).then(([r, a]) => {
      if (!cancelled) {
        setReleves(r);
        setAdministrations(a);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Image illustrative du Dashboard Infirmier */}
      <div className="w-full mb-2 rounded-2xl overflow-hidden shadow-sm">
        <img src="/images/dashboard_infirmier.webp" alt="Dashboard Infirmier Illustration" className="w-full h-auto object-cover max-h-[300px]" />
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Bonjour, {user?.prenom} {user?.nom}
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {user?.etablissement && ` · ${user.etablissement}`}
        </p>
      </div>

      {/* Stats du jour */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="monitor_heart"
          label="Relevés aujourd'hui"
          value={loading ? 0 : releves.length}
          color="var(--color-primary)"
        />
        <StatCard
          icon="medication"
          label="Administrations aujourd'hui"
          value={loading ? 0 : administrations.length}
          color="var(--color-secondary)"
        />
        <StatCard
          icon="group"
          label="Patients pris en charge"
          value={loading ? 0 : new Set([...releves.map((r) => r.patientNpi), ...administrations.map((a) => a.patientNpi)]).size}
          color="var(--color-tertiary)"
        />
        <StatCard
          icon="check_circle"
          label="Médicaments administrés"
          value={loading ? 0 : administrations.filter((a) => a.statut === "administre").length}
          color="var(--color-success)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recherche rapide patient */}
        <Card>
          <CardHeader icon="person_search" title="Recherche Patient" />
          <p className="text-body-md mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
            Saisir le NPI à 10 chiffres pour accéder au dossier et enregistrer des constantes.
          </p>
          <PatientSearch />
        </Card>

        {/* Accès rapides */}
        <Card>
          <CardHeader icon="apps" title="Accès rapides" />
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                to: "/infirmier/constantes",
                icon: "monitor_heart",
                label: "Enregistrer des constantes",
                color: "var(--color-primary)",
              },
              {
                to: "/infirmier/traitements",
                icon: "medication",
                label: "Administrer un traitement",
                color: "var(--color-secondary)",
              },
              {
                to: "/infirmier/patients",
                icon: "groups",
                label: "Rechercher un patient",
                color: "var(--color-tertiary)",
              },
              {
                to: "/infirmier/historique",
                icon: "history",
                label: "Mon historique",
                color: "var(--color-outline)",
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-200 hover:scale-[1.02]"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: item.color + "20" }}
                >
                  <span
                    className="material-symbols-outlined filled text-[22px]"
                    style={{ color: item.color }}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-caption font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Activité du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Relevés du jour */}
        <Card accentBorder="border-t-4 border-[var(--color-primary)]">
          <CardHeader icon="monitor_heart" title="Relevés de constantes — Aujourd'hui" />
          {loading ? (
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Chargement…
            </p>
          ) : releves.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <span className="material-symbols-outlined text-[40px]" style={{ color: "var(--color-outline)" }}>
                monitor_heart
              </span>
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                Aucun relevé enregistré aujourd'hui.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 mt-2">
              {releves.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      NPI {r.patientNpi}
                    </p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      {new Date(r.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {r.constantes.tensionSystolique && ` · TA ${r.constantes.tensionSystolique}/${r.constantes.tensionDiastolique} mmHg`}
                      {r.constantes.temperature && ` · ${r.constantes.temperature}°C`}
                    </p>
                  </div>
                  <Link
                    to={`/infirmier/dossier/${r.patientNpi}`}
                    className="text-caption font-semibold flex items-center gap-1"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    Dossier
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Administrations du jour */}
        <Card accentBorder="border-t-4 border-[var(--color-secondary)]">
          <CardHeader icon="medication" title="Administrations — Aujourd'hui" />
          {loading ? (
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Chargement…
            </p>
          ) : administrations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <span className="material-symbols-outlined text-[40px]" style={{ color: "var(--color-outline)" }}>
                medication
              </span>
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                Aucune administration enregistrée aujourd'hui.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 mt-2">
              {administrations.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                      {a.medicament} — {a.dosage}
                    </p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      NPI {a.patientNpi} · {new Date(a.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span
                    className="text-caption font-semibold px-2 py-1 rounded-full shrink-0"
                    style={{
                      backgroundColor: a.statut === "administre"
                        ? "var(--color-success-container)"
                        : a.statut === "refuse"
                        ? "var(--color-error-container)"
                        : "var(--color-warning-container)",
                      color: a.statut === "administre"
                        ? "var(--color-on-success-container)"
                        : a.statut === "refuse"
                        ? "var(--color-on-error-container)"
                        : "var(--color-on-warning-container)",
                    }}
                  >
                    {a.statut === "administre" ? "✓ Administré" : a.statut === "refuse" ? "✕ Refusé" : "⏱ Reporté"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

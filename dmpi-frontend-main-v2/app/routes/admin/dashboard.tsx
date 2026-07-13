// Dashboard Admin Établissement — DMPI
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatutBadge } from "../../components/ui/Badge";
import { formatDateFr } from "../../services/patientService";

import {
  getDashboardEtablissement,
  type StatEtablissement,
  type AlerteSysteme,
  type ActiviteRecente
} from "../../services/dashboardService";

const ALERTE_CONFIG = {
  info: { icon: "info", color: "var(--color-primary)", bg: "var(--color-primary-container)" },
  warning: { icon: "warning", color: "var(--color-warning)", bg: "var(--color-warning-container)" },
  error: { icon: "error", color: "var(--color-error)", bg: "var(--color-error-container)" },
};

const ACTIVITE_ICON: Record<ActiviteRecente["type"], string> = {
  consultation: "medical_services",
  ordonnance: "prescriptions",
  dossier: "monitor_heart",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatEtablissement | null>(null);
  const [alertes, setAlertes] = useState<AlerteSysteme[]>([]);
  const [activites, setActivites] = useState<ActiviteRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardEtablissement()
      .then((data) => {
        setStats(data.stats);
        setAlertes(data.alertes);
        setActivites(data.activite_recente);
      })
      .catch((err) => {
        console.error("Erreur chargement dashboard:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Image illustrative du Dashboard Admin */}
      <div className="w-full mb-2 rounded-2xl overflow-hidden shadow-sm">
        <img src="/images/dashboard_admin.png" alt="Dashboard Admin Illustration" className="w-full h-auto object-cover max-h-[300px]" />
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Tableau de bord administrateur
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          {user?.etablissement} · {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats principales */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl animate-pulse"
              style={{ backgroundColor: "var(--color-surface-container)" }}
            />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: "group", label: "Patients enregistrés", value: stats.totalPatients.toLocaleString("fr-FR"), color: "var(--color-primary)" },
            { icon: "medical_services", label: "Consultations (mois)", value: stats.consultationsMois, color: "var(--color-secondary)" },
            { icon: "prescriptions", label: "Ordonnances (mois)", value: stats.ordonnancesMois, color: "var(--color-tertiary)" },
            { icon: "stethoscope", label: "Médecins actifs", value: stats.medecinActifs, color: "var(--color-primary)" },
            { icon: "vaccines", label: "Infirmiers actifs", value: stats.infirmierActifs, color: "var(--color-secondary)" },
            { icon: "bed", label: "Taux d'occupation", value: `${stats.tauxOccupation}%`, color: stats.tauxOccupation > 80 ? "var(--color-error)" : "var(--color-success)" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-2 p-4 rounded-2xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <span className="material-symbols-outlined filled text-[22px]" style={{ color: s.color }}>
                {s.icon}
              </span>
              <p className="text-headline-sm font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="text-caption leading-tight" style={{ color: "var(--color-on-surface-variant)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alertes système */}
        <Card className="lg:col-span-1">
          <CardHeader title="Alertes & Notifications" icon="notifications_active" />
          <div className="flex flex-col gap-3 mt-4">
            {alertes.map((alerte) => {
              const conf = ALERTE_CONFIG[alerte.type];
              return (
                <div key={alerte.id} className="flex gap-3 p-3 rounded-xl items-start" style={{ backgroundColor: conf.bg }}>
                  <span className="material-symbols-outlined mt-0.5" style={{ color: conf.color }}>
                    {conf.icon}
                  </span>
                  <div>
                    <p className="text-body-md font-medium" style={{ color: "var(--color-on-surface)" }}>
                      {alerte.message}
                    </p>
                    <p className="text-caption mt-1 opacity-70" style={{ color: "var(--color-on-surface)" }}>
                      {formatDateFr(alerte.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Activité récente */}
        <Card className="lg:col-span-2">
          <CardHeader title="Activité Récente (Établissement)" icon="history" />
          <ul className="mt-4 flex flex-col gap-2">
            {activites.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--color-primary-container)" }}
                >
                  <span className="material-symbols-outlined filled text-[16px]" style={{ color: "var(--color-primary)" }}>
                    {ACTIVITE_ICON[a.type]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md truncate" style={{ color: "var(--color-on-surface)" }}>
                    {a.description}
                  </p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {a.utilisateur} · {new Date(a.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Personnel en service */}
      <Card>
        <CardHeader icon="badge" title="Personnel en service aujourd'hui" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { nom: "Dr. Kouassi Éric", role: "Médecin — Médecine interne", statut: "En service", color: "var(--color-success)" },
            { nom: "Dr. Amoussou Jean", role: "Médecin — Chirurgie générale", statut: "En service", color: "var(--color-success)" },
            { nom: "Inf. Mensah Béatrice", role: "Infirmière — Soins intensifs", statut: "En service", color: "var(--color-success)" },
            { nom: "Dr. Agossou Marie", role: "Médecin — Pédiatrie", statut: "Absent", color: "var(--color-error)" },
            { nom: "Inf. Tokplo Romain", role: "Infirmier — Urgences", statut: "En service", color: "var(--color-success)" },
            { nom: "Inf. Kakpo Esther", role: "Infirmière — Maternité", statut: "En pause", color: "var(--color-warning)" },
          ].map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-body-md shrink-0"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary-container)",
                }}
              >
                {p.nom.split(" ").filter(w => /^[A-ZÉÀÂ]/.test(w)).slice(0, 2).map(w => w[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                  {p.nom}
                </p>
                <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                  {p.role}
                </p>
              </div>
              <span
                className="text-caption font-semibold shrink-0"
                style={{ color: p.color }}
              >
                ● {p.statut}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

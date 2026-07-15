// Dashboard Admin Établissement — DMPI
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";

import {
  getDashboardEtablissement,
  type StatEtablissement,
  type ActiviteRecente,
  type MembrePersonnel,
} from "../../services/dashboardService";

const ACTIVITE_ICON: Record<ActiviteRecente["type"], string> = {
  consultation: "medical_services",
  ordonnance: "prescriptions",
  dossier: "monitor_heart",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatEtablissement | null>(null);
  const [personnel, setPersonnel] = useState<MembrePersonnel[]>([]);
  const [activites, setActivites] = useState<ActiviteRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardEtablissement()
      .then((data) => {
        setStats(data.stats);
        setPersonnel(data.personnel);
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
        <img src="/images/dashboard_admin.webp" alt="Dashboard Admin Illustration" className="w-full h-auto object-cover max-h-[300px]" />
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl animate-pulse"
              style={{ backgroundColor: "var(--color-surface-container)" }}
            />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { icon: "group", label: "Patients enregistrés", value: stats.totalPatients.toLocaleString("fr-FR"), color: "var(--color-primary)" },
            { icon: "medical_services", label: "Consultations (mois)", value: stats.consultationsMois, color: "var(--color-secondary)" },
            { icon: "prescriptions", label: "Ordonnances (mois)", value: stats.ordonnancesMois, color: "var(--color-tertiary)" },
            { icon: "stethoscope", label: "Médecins actifs", value: stats.medecinActifs, color: "var(--color-primary)" },
            { icon: "vaccines", label: "Infirmiers actifs", value: stats.infirmierActifs, color: "var(--color-secondary)" },
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

      {/* Activité récente */}
      <Card>
        <CardHeader title="Activité Récente (Établissement)" icon="history" />
        {activites.length === 0 ? (
          <p className="text-body-md mt-2" style={{ color: "var(--color-on-surface-variant)" }}>Aucune activité récente.</p>
        ) : (
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
        )}
      </Card>

      {/* Personnel */}
      <Card>
        <CardHeader icon="badge" title="Personnel médical et infirmier" />
        {personnel.length === 0 ? (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucun médecin ni infirmier rattaché à cet établissement.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personnel.map((p, i) => {
              const nomComplet = `${p.prenom} ${p.nom}`;
              const roleLabel = p.role === "medecin" ? "Médecin" : "Infirmier(e)";
              const detail = [p.specialite, p.service].filter(Boolean).join(" · ");
              return (
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
                    {p.prenom[0]}{p.nom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                      {nomComplet}
                    </p>
                    <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                      {roleLabel}{detail ? ` — ${detail}` : ""}
                    </p>
                  </div>
                  <span
                    className="text-caption font-semibold shrink-0"
                    style={{ color: p.actif_aujourdhui ? "var(--color-success)" : "var(--color-on-surface-variant)" }}
                  >
                    ● {p.actif_aujourdhui ? "Actif aujourd'hui" : "Inactif aujourd'hui"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

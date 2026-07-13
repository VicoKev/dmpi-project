import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatutBadge } from "../../components/ui/Badge";
import PatientSearch from "../../components/patient/PatientSearch";
import { getTodayConsultations } from "../../services/consultationService";
import { formatDateFr } from "../../services/patientService";
import type { Consultation } from "../../types/consultation";

export default function MedecinDashboard() {
  const { user } = useAuth();
  const [consultationsJour, setConsultationsJour] = useState<Consultation[]>([]);
  const [loadingActivite, setLoadingActivite] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getTodayConsultations(user.email).then((res) => {
      if (!cancelled) {
        setConsultationsJour(res);
        setLoadingActivite(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Image illustrative du Dashboard Medecin */}
      <div className="w-full mb-2 rounded-2xl overflow-hidden shadow-sm">
        <img src="/images/dashboard_medecin.webp" alt="Dashboard Medecin Illustration" className="w-full h-auto object-cover max-h-[300px]" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-lg text-[var(--color-primary)]">
            Bonjour, Dr. {user?.nom}
          </h1>
          <p className="text-body-md text-[var(--color-on-surface-variant)]">
            {new Date().toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recherche Patient */}
        <Card className="lg:col-span-2">
          <CardHeader icon="search" title="Recherche Dossier Patient" />
          <p className="text-body-md text-[var(--color-on-surface-variant)] mb-4">
            Saisissez le NPI à 10 chiffres du patient pour accéder à son dossier médical partagé.
          </p>
          <PatientSearch />
        </Card>

        {/* Résumé activité du jour */}
        <Card accentBorder="border-t-4 border-[var(--color-primary)]">
          <CardHeader icon="calendar_today" title="Activité du jour" />
          {loadingActivite ? (
            <p className="text-body-md text-[var(--color-on-surface-variant)]">Chargement…</p>
          ) : consultationsJour.length === 0 ? (
            <p className="text-body-md text-[var(--color-on-surface-variant)]">
              Aucune consultation enregistrée aujourd'hui.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 mt-2">
              {consultationsJour.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-3 bg-[var(--color-surface-container-low)] rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold truncate">{c.motif}</p>
                    <p className="text-caption text-[var(--color-on-surface-variant)]">
                      {formatDateFr(c.date)}
                    </p>
                  </div>
                  <StatutBadge statut={c.statut} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

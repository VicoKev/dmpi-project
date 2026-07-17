import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { StatutBadge } from "../../components/ui/Badge";
import PatientSearch from "../../components/patient/PatientSearch";
import { getTodayConsultations } from "../../services/consultationService";
import { formatDateFr } from "../../services/patientService";
import {
  getMesPatientsAssignes,
  terminerPriseEnCharge,
  getMaDisponibilite,
  definirMaDisponibilite,
  type EntreeFileAttente,
} from "../../services/fileAttenteService";
import type { Consultation } from "../../types/consultation";

const REFRESH_MS = 20_000;

function DisponibiliteToggle() {
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMaDisponibilite()
      .then(setDisponible)
      .catch(() => setDisponible(null));
  }, []);

  const handleToggle = async () => {
    if (disponible === null || saving) return;
    setSaving(true);
    try {
      const next = await definirMaDisponibilite(!disponible);
      setDisponible(next);
    } catch (err) {
      alert((err as Error).message || "Erreur lors de la mise à jour de la disponibilité.");
    } finally {
      setSaving(false);
    }
  };

  if (disponible === null) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={saving}
      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 disabled:opacity-60"
      style={{
        backgroundColor: disponible ? "var(--color-tertiary-container)" : "var(--color-error-container)",
        color: disponible ? "var(--color-on-tertiary-container)" : "var(--color-on-error-container)",
      }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: disponible ? "var(--color-tertiary)" : "var(--color-error)" }}
      />
      <span className="text-body-md font-semibold">
        {disponible ? "Disponible" : "Indisponible"}
      </span>
      <span className="material-symbols-outlined text-[18px]">
        {disponible ? "toggle_on" : "toggle_off"}
      </span>
    </button>
  );
}

function FileAttenteCard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<EntreeFileAttente[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPatients(await getMesPatientsAssignes());
    } catch {
      // Échec silencieux : on retentera au prochain cycle de rafraîchissement.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleTerminer = async (entree: EntreeFileAttente) => {
    setActionId(entree.id);
    try {
      await terminerPriseEnCharge(entree.id);
      await load();
    } catch (err) {
      alert((err as Error).message || "Erreur lors de la clôture.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Card accentBorder="border-t-4 border-[var(--color-primary)]">
      <CardHeader icon="groups" title={`Patients qui m'attendent (${patients.length})`} />
      {loading ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Chargement…</p>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
          <span className="material-symbols-outlined text-[40px] opacity-40">event_available</span>
          <p className="text-body-md">Aucun patient assigné pour le moment.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 mt-2">
          {patients.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="min-w-0">
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {p.prenom} {p.nom}
                  {p.priorite === "urgente" && (
                    <span
                      className="text-caption font-semibold px-2 py-0.5 rounded-full ml-2"
                      style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}
                    >
                      Urgente
                    </span>
                  )}
                </p>
                <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                  {p.motif_bref || "Sans motif renseigné"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  icon="folder_open"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/medecin/dossier/${p.npi}`)}
                >
                  Dossier
                </Button>
                {p.statut !== "assigne" && (
                  <Button icon="check_circle" size="sm" loading={actionId === p.id} onClick={() => handleTerminer(p)}>
                    Terminer
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

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
      {/* Image illustrative du Dashboard Médecin */}
      <div className="w-full mb-2 rounded-2xl overflow-hidden shadow-sm">
        <img src="/images/dashboard_medecin.webp" alt="Dashboard Médecin Illustration" className="w-full h-auto object-cover max-h-[300px]" />
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
        <DisponibiliteToggle />
      </div>

      <FileAttenteCard />

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

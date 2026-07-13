// Dashboard Patient — Mon Dossier Médical
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { AllergieBadge } from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { getDossierPatient, calculerAge, formatDateFr } from "../../services/patientService";
import { getConsultationsByPatient } from "../../services/consultationService";
import { getPrescriptionsByPatient } from "../../services/prescriptionService";
import type { DossierPatient } from "../../types/patient";
import type { Consultation } from "../../types/consultation";
import type { Prescription } from "../../types/prescription";

function QuickLinkCard({
  to,
  icon,
  label,
  subtitle,
  color,
}: {
  to: string;
  icon: string;
  label: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
      style={{ backgroundColor: "var(--color-surface-container-low)" }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "20" }}
      >
        <span className="material-symbols-outlined filled text-[24px]" style={{ color }}>
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
          {label}
        </p>
        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
          {subtitle}
        </p>
      </div>
      <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-outline)" }}>
        chevron_right
      </span>
    </Link>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const npi = user?.patientNpi;

  const [dossier, setDossier] = useState<DossierPatient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!npi) { setLoading(false); return; }
    let cancelled = false;
    Promise.all([
      getDossierPatient(npi),
      getConsultationsByPatient(npi),
      getPrescriptionsByPatient(npi),
    ]).then(([d, c, p]) => {
      if (cancelled) return;
      setDossier(d);
      setConsultations(c);
      setPrescriptions(p);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [npi]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" label="Chargement de votre dossier…" />
      </div>
    );
  }

  if (!npi || !dossier) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <Card>
          <CardHeader icon="error" title="Dossier introuvable" />
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Votre dossier médical n'a pas encore été créé dans le système DMPI.
            Contactez votre établissement de santé.
          </p>
        </Card>
      </div>
    );
  }

  const { patient, allergies, traitementsEnCours } = dossier;
  const derniereConsultation = consultations[0] ?? null;
  const derniereOrdonnance = prescriptions[0] ?? null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Image illustrative du Dashboard Patient */}
      <div className="w-full mb-6 rounded-2xl overflow-hidden shadow-sm">
        <img src="/images/dashboard_patient.png" alt="Dashboard Patient Illustration" className="w-full h-auto object-cover max-h-[300px]" />
      </div>

      {/* En-tête Patient */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-headline-sm font-bold shadow-sm shrink-0"
          style={{
            backgroundColor: "var(--color-primary-container)",
            color: "var(--color-on-primary-container)",
          }}
        >
          {patient.prenom[0]}{patient.nom[0]}
        </div>
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Bonjour, {patient.prenom}
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            NPI : {patient.npi} · {patient.sexe === "M" ? "Homme" : "Femme"} · {calculerAge(patient.dateNaissance)} ans
            {patient.groupeSanguin && ` · Groupe ${patient.groupeSanguin}`}
          </p>
        </div>
      </div>

      {/* Alertes allergies */}
      {allergies.length > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ backgroundColor: "var(--color-error-container)" }}
        >
          <span className="material-symbols-outlined filled text-[22px] shrink-0 mt-0.5" style={{ color: "var(--color-error)" }}>
            warning
          </span>
          <div>
            <p className="text-body-md font-semibold" style={{ color: "var(--color-on-error-container)" }}>
              Allergies connues — à signaler à tout professionnel de santé
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {allergies.map((a) => (
                <AllergieBadge key={a.id} substance={a.substance} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: "medical_services", label: "Consultations", value: consultations.length, color: "var(--color-primary)" },
          { icon: "prescriptions", label: "Ordonnances", value: prescriptions.length, color: "var(--color-secondary)" },
          { icon: "medication", label: "Traitements actifs", value: traitementsEnCours.filter((t) => t.actif).length, color: "var(--color-tertiary)" },
          { icon: "vaccines", label: "Vaccinations", value: dossier.vaccinations.length, color: "var(--color-success)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--color-surface-container-low)" }}
          >
            <span className="material-symbols-outlined filled text-[22px]" style={{ color: stat.color }}>
              {stat.icon}
            </span>
            <p className="text-headline-sm font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accès rapides */}
        <Card>
          <CardHeader icon="apps" title="Mon espace santé" />
          <div className="flex flex-col gap-3">
            <QuickLinkCard
              to="/patient/ordonnances"
              icon="prescriptions"
              label="Mes ordonnances"
              subtitle={`${prescriptions.length} ordonnance(s) au total`}
              color="var(--color-primary)"
            />
            <QuickLinkCard
              to="/patient/resultats"
              icon="lab_panel"
              label="Mes résultats d'examens"
              subtitle={`${dossier.examens.length} examen(s) disponible(s)`}
              color="var(--color-secondary)"
            />
            <QuickLinkCard
              to="/patient/rendez-vous"
              icon="calendar_month"
              label="Mes rendez-vous"
              subtitle="Consultations passées et à venir"
              color="var(--color-tertiary)"
            />
          </div>
        </Card>

        {/* Dernière consultation + ordonnance */}
        <div className="flex flex-col gap-4">
          {/* Dernière consultation */}
          <Card accentBorder="border-t-4 border-[var(--color-primary)]">
            <CardHeader icon="medical_services" title="Dernière consultation" />
            {!derniereConsultation ? (
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                Aucune consultation enregistrée.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {derniereConsultation.motif}
                </p>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  {formatDateFr(derniereConsultation.date)} · {derniereConsultation.medecin}
                </p>
                {derniereConsultation.diagnosticPrincipal && (
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    <span className="font-semibold">Diagnostic : </span>
                    {derniereConsultation.diagnosticPrincipal.libelle}
                  </p>
                )}
                {derniereConsultation.conduiteATenir && (
                  <div
                    className="mt-2 p-3 rounded-xl text-body-md"
                    style={{
                      backgroundColor: "var(--color-surface-container-low)",
                      color: "var(--color-on-surface-variant)",
                    }}
                  >
                    <span className="font-semibold">Conduite à tenir : </span>
                    {derniereConsultation.conduiteATenir}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Dernière ordonnance */}
          <Card accentBorder="border-t-4 border-[var(--color-secondary)]">
            <CardHeader icon="prescriptions" title="Dernière ordonnance" />
            {!derniereOrdonnance ? (
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                Aucune ordonnance enregistrée.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  {formatDateFr(derniereOrdonnance.date)} · {derniereOrdonnance.prescripteur}
                </p>
                <ul className="flex flex-col gap-1 mt-1">
                  {derniereOrdonnance.lignes.slice(0, 3).map((ligne) => (
                    <li
                      key={ligne.id}
                      className="flex items-center gap-2 text-body-md"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      <span className="material-symbols-outlined filled text-[16px]" style={{ color: "var(--color-secondary)" }}>
                        medication
                      </span>
                      <span className="font-semibold">{ligne.medicament}</span>
                      <span className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        {ligne.dosage}
                      </span>
                    </li>
                  ))}
                  {derniereOrdonnance.lignes.length > 3 && (
                    <li className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      + {derniereOrdonnance.lignes.length - 3} autre(s) médicament(s)…
                    </li>
                  )}
                </ul>
                <Link
                  to="/patient/ordonnances"
                  className="text-caption font-semibold mt-1 self-start"
                  style={{ color: "var(--color-primary)" }}
                >
                  Voir toutes mes ordonnances →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Traitements en cours */}
      {traitementsEnCours.filter((t) => t.actif).length > 0 && (
        <Card>
          <CardHeader icon="medication" title="Mes traitements en cours" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {traitementsEnCours
              .filter((t) => t.actif)
              .map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-1 p-3 rounded-xl"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {t.medicament}
                  </p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {t.dosage} · {t.frequence}
                  </p>
                  {t.prescripteur && (
                    <p className="text-caption" style={{ color: "var(--color-outline)" }}>
                      Prescrit par {t.prescripteur}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Mes Ordonnances — Espace Patient
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatutBadge } from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { getPrescriptionsByPatient } from "../../services/prescriptionService";
import { formatDateFr } from "../../services/patientService";
import type { Prescription } from "../../types/prescription";
import { FREQUENCE_LABELS } from "../../types/prescription";

function PrescriptionCard({ prescription: p }: { prescription: Prescription }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      {/* En-tête cliquable */}
      <button
        className="w-full flex items-center justify-between gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
            Ordonnance du {formatDateFr(p.date)}
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {p.prescripteur} · {p.etablissement}
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {p.lignes.length} médicament{p.lignes.length > 1 ? "s" : ""}
            {p.lignes.some((l) => l.renouvelable) && " · Renouvelable"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatutBadge statut={p.statut} />
          <span
            className="material-symbols-outlined text-[20px] transition-transform duration-200"
            style={{
              color: "var(--color-on-surface-variant)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Détail dépliable */}
      {open && (
        <div className="mt-4 flex flex-col gap-3 animate-fade-in">
          {p.lignes.map((ligne) => (
            <div
              key={ligne.id}
              className="p-3 rounded-xl flex flex-col gap-1"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined filled text-[18px]"
                  style={{ color: "var(--color-secondary)" }}
                >
                  medication
                </span>
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {ligne.medicament} — {ligne.dosage}
                </p>
                {ligne.renouvelable && (
                  <span
                    className="text-caption font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-on-primary-container)",
                    }}
                  >
                    Renouvelable
                  </span>
                )}
              </div>
              {ligne.forme && (
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  Forme : {ligne.forme}
                </p>
              )}
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                {ligne.posologie && `${ligne.posologie} · `}
                {FREQUENCE_LABELS[ligne.frequence]}
                {ligne.dureeJours && ` · ${ligne.dureeJours} jour(s)`}
              </p>
              {ligne.instructions && (
                <p className="text-caption italic" style={{ color: "var(--color-on-surface-variant)" }}>
                  ℹ {ligne.instructions}
                </p>
              )}
            </div>
          ))}

          {p.noteGlobale && (
            <div
              className="p-3 rounded-xl text-body-md"
              style={{
                backgroundColor: "var(--color-warning-container)",
                color: "var(--color-on-warning-container)",
              }}
            >
              <span className="font-semibold">Note du médecin : </span>
              {p.noteGlobale}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function PatientOrdonnances() {
  const { user } = useAuth();
  const npi = user?.patientNpi;
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!npi) { setLoading(false); return; }
    let cancelled = false;
    getPrescriptionsByPatient(npi).then((res) => {
      if (!cancelled) { setPrescriptions(res); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [npi]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes ordonnances
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Toutes vos prescriptions médicales. Cliquez sur une ordonnance pour voir le détail.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Chargement de vos ordonnances…" />
        </div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--color-outline)" }}>
              prescriptions
            </span>
            <p className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
              Aucune ordonnance enregistrée
            </p>
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Vos ordonnances apparaîtront ici après une consultation médicale.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {prescriptions.map((p) => (
            <PrescriptionCard key={p.id} prescription={p} />
          ))}
        </div>
      )}
    </div>
  );
}

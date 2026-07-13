// Mes Résultats d'examens — Espace Patient
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import { getDossierPatient, formatDateFr } from "../../services/patientService";
import type { ResultatExamen } from "../../types/patient";

const TYPE_LABELS: Record<ResultatExamen["type"], { label: string; icon: string; color: string }> = {
  biologie: { label: "Biologie", icon: "science", color: "var(--color-primary)" },
  imagerie: { label: "Imagerie", icon: "radiology", color: "var(--color-secondary)" },
  ecg: { label: "ECG", icon: "monitor_heart", color: "var(--color-error)" },
  anatomopathologie: { label: "Anatomopathologie", icon: "biotech", color: "var(--color-tertiary)" },
  autre: { label: "Autre", icon: "lab_panel", color: "var(--color-outline)" },
};

const STATUT_CONFIG: Record<ResultatExamen["statut"], { label: string; color: string; bg: string }> = {
  disponible: {
    label: "Disponible",
    color: "var(--color-on-success-container)",
    bg: "var(--color-success-container)",
  },
  en_attente: {
    label: "En attente",
    color: "var(--color-on-warning-container)",
    bg: "var(--color-warning-container)",
  },
  urgent: {
    label: "Urgent",
    color: "var(--color-on-error-container)",
    bg: "var(--color-error-container)",
  },
};

function ExamenCard({ examen: e }: { examen: ResultatExamen }) {
  const [open, setOpen] = useState(e.statut === "disponible");
  const typeInfo = TYPE_LABELS[e.type] ?? TYPE_LABELS.autre;
  const statutInfo = STATUT_CONFIG[e.statut];

  return (
    <Card>
      <button
        className="w-full flex items-center gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
        disabled={e.statut !== "disponible"}
      >
        {/* Icône type */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: typeInfo.color + "18" }}
        >
          <span className="material-symbols-outlined filled text-[20px]" style={{ color: typeInfo.color }}>
            {typeInfo.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
            {e.libelle}
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {formatDateFr(e.date)}
            {e.laboratoire && ` · ${e.laboratoire}`}
            {e.prescripteur && ` · Prescrit par ${e.prescripteur}`}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Badge statut */}
          <span
            className="text-caption font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: statutInfo.bg, color: statutInfo.color }}
          >
            {statutInfo.label}
          </span>
          {e.statut === "disponible" && (
            <span
              className="material-symbols-outlined text-[20px] transition-transform duration-200"
              style={{
                color: "var(--color-on-surface-variant)",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              expand_more
            </span>
          )}
        </div>
      </button>

      {/* Résultats dépliables */}
      {open && e.statut === "disponible" && (
        <div className="mt-4 flex flex-col gap-3 animate-fade-in">
          {/* Valeurs biologiques */}
          {e.valeurs && e.valeurs.length > 0 && (
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: "var(--color-outline-variant)" }}
            >
              <table className="w-full text-body-md">
                <thead>
                  <tr style={{ backgroundColor: "var(--color-surface-container)" }}>
                    <th className="text-left px-3 py-2 text-caption font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
                      Paramètre
                    </th>
                    <th className="text-right px-3 py-2 text-caption font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
                      Résultat
                    </th>
                    <th className="text-right px-3 py-2 text-caption font-semibold hidden sm:table-cell" style={{ color: "var(--color-on-surface-variant)" }}>
                      Norme
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {e.valeurs.map((v, i) => (
                    <tr
                      key={i}
                      className="border-t"
                      style={{
                        borderColor: "var(--color-outline-variant)",
                        backgroundColor: v.anormal
                          ? "var(--color-error-container)"
                          : "transparent",
                      }}
                    >
                      <td className="px-3 py-2" style={{ color: "var(--color-on-surface)" }}>
                        {v.anormal && (
                          <span className="material-symbols-outlined text-[14px] mr-1" style={{ color: "var(--color-error)" }}>
                            warning
                          </span>
                        )}
                        {v.parametre}
                      </td>
                      <td
                        className="px-3 py-2 text-right font-semibold"
                        style={{ color: v.anormal ? "var(--color-error)" : "var(--color-on-surface)" }}
                      >
                        {v.valeur} {v.unite}
                      </td>
                      <td
                        className="px-3 py-2 text-right hidden sm:table-cell"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {v.valeurNormale ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Commentaire (imagerie / autre) */}
          {e.commentaire && (
            <div
              className="p-3 rounded-xl text-body-md"
              style={{
                backgroundColor: "var(--color-surface-container-low)",
                color: "var(--color-on-surface-variant)",
              }}
            >
              <span className="font-semibold">Compte rendu : </span>
              {e.commentaire}
            </div>
          )}
        </div>
      )}

      {/* En attente */}
      {e.statut === "en_attente" && (
        <div
          className="mt-3 flex items-center gap-2 p-3 rounded-xl text-body-md"
          style={{
            backgroundColor: "var(--color-warning-container)",
            color: "var(--color-on-warning-container)",
          }}
        >
          <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
          Les résultats ne sont pas encore disponibles. Ils apparaîtront ici dès réception.
        </div>
      )}
    </Card>
  );
}

export default function PatientResultats() {
  const { user } = useAuth();
  const npi = user?.patientNpi;
  const [examens, setExamens] = useState<ResultatExamen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!npi) { setLoading(false); return; }
    let cancelled = false;
    getDossierPatient(npi).then((d) => {
      if (!cancelled) {
        setExamens(d?.examens ?? []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [npi]);

  const disponibles = examens.filter((e) => e.statut === "disponible");
  const enAttente = examens.filter((e) => e.statut === "en_attente");
  const autres = examens.filter((e) => e.statut !== "disponible" && e.statut !== "en_attente");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes résultats d'examens
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Vos examens biologiques, d'imagerie et comptes rendus médicaux.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Chargement de vos résultats…" />
        </div>
      ) : examens.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--color-outline)" }}>
              lab_panel
            </span>
            <p className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
              Aucun examen enregistré
            </p>
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Vos résultats d'examens apparaîtront ici dès que votre médecin les aura prescrits et que les résultats seront disponibles.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Résultats disponibles */}
          {disponibles.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined filled text-[20px]" style={{ color: "var(--color-success)" }}>
                  check_circle
                </span>
                <h2 className="text-subheading" style={{ color: "var(--color-on-surface)" }}>
                  Disponibles ({disponibles.length})
                </h2>
              </div>
              {disponibles.map((e) => <ExamenCard key={e.id} examen={e} />)}
            </div>
          )}

          {/* En attente */}
          {enAttente.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-warning)" }}>
                  hourglass_empty
                </span>
                <h2 className="text-subheading" style={{ color: "var(--color-on-surface)" }}>
                  En attente ({enAttente.length})
                </h2>
              </div>
              {enAttente.map((e) => <ExamenCard key={e.id} examen={e} />)}
            </div>
          )}

          {autres.length > 0 && autres.map((e) => <ExamenCard key={e.id} examen={e} />)}
        </div>
      )}
    </div>
  );
}

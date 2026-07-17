// Mon historique — Espace Infirmier
// Journal chronologique de l'activité de soins du professionnel connecté
// (relevés de constantes + administrations de traitements).
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Card, { CardHeader } from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import { getRelevesByInfirmier, type ReleveConstantes } from "../../services/constanstesService";
import { getAdministrationsByInfirmier, type AdministrationMedicament } from "../../services/administrationService";

type FiltreType = "tous" | "constantes" | "administrations";

interface EvenementHistorique {
  id: string;
  type: "constante" | "administration";
  npi: string;
  date: string;
  resume: string;
  detail: string;
  statut?: AdministrationMedicament["statut"];
}

function fusionner(releves: ReleveConstantes[], administrations: AdministrationMedicament[]): EvenementHistorique[] {
  const evenementsConstantes: EvenementHistorique[] = releves.map((r) => ({
    id: `c_${r.id}`,
    type: "constante",
    npi: r.patientNpi,
    date: r.date,
    resume: "Relevé de constantes",
    detail: [
      r.constantes.tensionSystolique && `TA ${r.constantes.tensionSystolique}/${r.constantes.tensionDiastolique} mmHg`,
      r.constantes.pouls && `Pouls ${r.constantes.pouls} bpm`,
      r.constantes.temperature && `${r.constantes.temperature}°C`,
    ].filter(Boolean).join(" · ") || "—",
  }));

  const evenementsAdmin: EvenementHistorique[] = administrations.map((a) => ({
    id: `a_${a.id}`,
    type: "administration",
    npi: a.patientNpi,
    date: a.date,
    resume: `${a.medicament}${a.dosage ? ` — ${a.dosage}` : ""}`,
    detail: a.notes || "—",
    statut: a.statut,
  }));

  return [...evenementsConstantes, ...evenementsAdmin].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  administre: { label: "Administré", color: "var(--color-on-success-container)", bg: "var(--color-success-container)" },
  refuse: { label: "Refusé", color: "var(--color-on-error-container)", bg: "var(--color-error-container)" },
  reporte: { label: "Reporté", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)" },
};

const FILTRES: { key: FiltreType; label: string; icon: string }[] = [
  { key: "tous", label: "Tout", icon: "history" },
  { key: "constantes", label: "Constantes", icon: "monitor_heart" },
  { key: "administrations", label: "Administrations", icon: "medication" },
];

export default function InfirmierHistorique() {
  const [evenements, setEvenements] = useState<EvenementHistorique[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<FiltreType>("tous");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRelevesByInfirmier(), getAdministrationsByInfirmier()])
      .then(([releves, administrations]) => {
        if (cancelled) return;
        setEvenements(fusionner(releves, administrations));
      })
      .catch((err) => {
        if (!cancelled) setErreur((err as Error).message || "Impossible de charger l'historique.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const evenementsFiltres = evenements.filter((e) => {
    if (filtre === "tous") return true;
    if (filtre === "constantes") return e.type === "constante";
    return e.type === "administration";
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mon historique
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Journal de vos relevés de constantes et administrations de traitements, du plus récent au plus ancien.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {FILTRES.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-body-md font-semibold whitespace-nowrap transition-all"
            style={
              filtre === f.key
                ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }
                : { backgroundColor: "var(--color-surface-container-low)", color: "var(--color-on-surface-variant)" }
            }
          >
            <span className="material-symbols-outlined text-[18px]">{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader icon="history" title={`Événements (${evenementsFiltres.length})`} />

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Chargement de l'historique…" />
          </div>
        ) : erreur ? (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            <span className="material-symbols-outlined">error</span>
            <span>{erreur}</span>
          </div>
        ) : evenementsFiltres.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-[48px] opacity-40">history</span>
            <p className="text-body-md">Aucun événement enregistré pour l'instant.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {evenementsFiltres.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: e.type === "constante" ? "var(--color-primary-container)" : "var(--color-secondary-container)",
                  }}
                >
                  <span
                    className="material-symbols-outlined filled text-[20px]"
                    style={{ color: e.type === "constante" ? "var(--color-on-primary-container)" : "var(--color-secondary)" }}
                  >
                    {e.type === "constante" ? "monitor_heart" : "medication"}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {e.resume}
                    </p>
                    {e.statut && STATUT_CONFIG[e.statut] && (
                      <span
                        className="text-caption font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: STATUT_CONFIG[e.statut].bg, color: STATUT_CONFIG[e.statut].color }}
                      >
                        {STATUT_CONFIG[e.statut].label}
                      </span>
                    )}
                  </div>
                  <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                    NPI {e.npi} · {e.detail}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {" · "}
                    {new Date(e.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <Link
                    to={`/infirmier/dossier/${e.npi}`}
                    className="text-caption font-semibold flex items-center gap-1"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Dossier
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

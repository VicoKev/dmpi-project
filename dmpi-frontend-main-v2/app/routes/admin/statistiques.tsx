// Statistiques — Espace Admin Établissement
import Card, { CardHeader } from "../../components/ui/Card";
import { useAuth } from "../../contexts/AuthContext";

// Données mock pour les graphiques (représentées en CSS sans lib externe)
const CONSULTATIONS_PAR_MOIS = [
  { mois: "Janv", val: 210 },
  { mois: "Févr", val: 245 },
  { mois: "Mars", val: 198 },
  { mois: "Avr", val: 312 },
  { mois: "Mai", val: 287 },
  { mois: "Juin", val: 334 },
  { mois: "Juil", val: 347 },
];

const MAX_CONS = Math.max(...CONSULTATIONS_PAR_MOIS.map((c) => c.val));

const TOP_DIAGNOSTICS = [
  { code: "E11", libelle: "Diabète de type 2", count: 98, pct: 28 },
  { code: "I10", libelle: "Hypertension artérielle", count: 74, pct: 21 },
  { code: "J06.9", libelle: "Infection respiratoire haute", count: 62, pct: 18 },
  { code: "D50", libelle: "Anémie ferriprive", count: 41, pct: 12 },
  { code: "B50", libelle: "Paludisme à Plasmodium falciparum", count: 38, pct: 11 },
  { code: "K29.7", libelle: "Gastrite", count: 34, pct: 10 },
];

const ACTIVITE_PAR_SERVICE = [
  { service: "Médecine interne", consultations: 142, pct: 41 },
  { service: "Chirurgie générale", consultations: 89, pct: 26 },
  { service: "Pédiatrie", consultations: 67, pct: 19 },
  { service: "Maternité", consultations: 49, pct: 14 },
];

export default function AdminStatistiques() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Statistiques
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          {user?.etablissement} · Données du mois en cours et tendances.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: "trending_up", label: "Consultations ce mois", value: "347", delta: "+12% vs mois préc.", positive: true },
          { icon: "group_add", label: "Nouveaux patients", value: "43", delta: "+5% vs mois préc.", positive: true },
          { icon: "avg_pace", label: "Durée moy. consultation", value: "22 min", delta: "-3 min vs mois préc.", positive: true },
          { icon: "event_busy", label: "Rendez-vous annulés", value: "18", delta: "+3 vs mois préc.", positive: false },
        ].map((k) => (
          <div
            key={k.label}
            className="flex flex-col gap-2 p-4 rounded-2xl"
            style={{ backgroundColor: "var(--color-surface-container-low)" }}
          >
            <span className="material-symbols-outlined filled text-[22px]" style={{ color: "var(--color-primary)" }}>
              {k.icon}
            </span>
            <p className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
              {k.value}
            </p>
            <p className="text-caption leading-tight" style={{ color: "var(--color-on-surface-variant)" }}>
              {k.label}
            </p>
            <p
              className="text-caption font-semibold"
              style={{ color: k.positive ? "var(--color-success)" : "var(--color-error)" }}
            >
              {k.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique consultations par mois */}
        <Card>
          <CardHeader icon="bar_chart" title="Consultations par mois (2025)" />
          <div className="flex items-end gap-2 h-40 mt-4">
            {CONSULTATIONS_PAR_MOIS.map((c) => {
              const height = Math.round((c.val / MAX_CONS) * 100);
              const isLast = c.mois === "Juil";
              return (
                <div key={c.mois} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-caption font-semibold" style={{ color: "var(--color-primary)" }}>
                    {c.val}
                  </span>
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${height}%`,
                      backgroundColor: isLast ? "var(--color-primary)" : "var(--color-primary-container)",
                      minHeight: "8px",
                    }}
                  />
                  <span className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {c.mois}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Activité par service */}
        <Card>
          <CardHeader icon="domain" title="Répartition par service" />
          <div className="flex flex-col gap-4 mt-2">
            {ACTIVITE_PAR_SERVICE.map((s) => (
              <div key={s.service} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <p className="text-body-md" style={{ color: "var(--color-on-surface)" }}>
                    {s.service}
                  </p>
                  <p className="text-caption font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
                    {s.consultations} · {s.pct}%
                  </p>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${s.pct}%`,
                      backgroundColor: "var(--color-primary)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top diagnostics */}
      <Card>
        <CardHeader icon="diagnosis" title="Top diagnostics — Mois en cours (CIM-10)" />
        <div className="flex flex-col gap-3 mt-2">
          {TOP_DIAGNOSTICS.map((d, i) => (
            <div key={d.code} className="flex items-center gap-4">
              <span
                className="w-6 text-body-md font-bold text-right shrink-0"
                style={{ color: i < 3 ? "var(--color-primary)" : "var(--color-outline)" }}
              >
                #{i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-body-md truncate" style={{ color: "var(--color-on-surface)" }}>
                    <span className="font-semibold">{d.code}</span> — {d.libelle}
                  </p>
                  <p className="text-caption shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>
                    {d.count} cas
                  </p>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--color-surface-container)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.pct}%`,
                      backgroundColor: i < 3 ? "var(--color-primary)" : "var(--color-secondary)",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

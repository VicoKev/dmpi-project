// Rapports Nationaux — Espace Super Admin National
import { useState, useEffect } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { apiFetch } from "../../services/api";

interface DashboardNational {
  utilisateurs_par_role: Record<string, number>;
  activite_clinique: {
    total_dossiers_patients: number;
    total_consultations: number;
    consultations_7_derniers_jours: number;
  };
  epidemiologie: {
    top_diagnostics_cim10: { diagnostic_cim10: string; nombre_cas: number }[];
  };
  urgences: {
    total_acces_break_the_glass: number;
    acces_break_the_glass_aujourdhui: number;
  };
  genere_le: string;
}


interface RapportMensuel {
  mois: string; // ex: "Juin 2025"
  consultations: number;
  patients: number;
  ordonnances: number;
  etablissements: number;
  tauxCouverture: number;
  topDiagnostics: { code: string; libelle: string; count: number }[];
  topEtablissements: { nom: string; consultations: number }[];
  evolutionConsultations: number[]; // 7 derniers jours
}

const RAPPORTS: RapportMensuel[] = [
  {
    mois: "Juin 2025",
    consultations: 12847,
    patients: 84320,
    ordonnances: 9412,
    etablissements: 45,
    tauxCouverture: 62,
    topDiagnostics: [
      { code: "J06.9", libelle: "Infection voies respiratoires", count: 1840 },
      { code: "A09", libelle: "Gastroenterite et colite", count: 1203 },
      { code: "I10", libelle: "Hypertension arterielle", count: 987 },
      { code: "B50", libelle: "Paludisme a Plasmodium falciparum", count: 872 },
      { code: "K29", libelle: "Gastrite et duodenite", count: 654 },
    ],
    topEtablissements: [
      { nom: "CNHU Hubert K. Maga", consultations: 3412 },
      { nom: "CHD Borgou-Alibori", consultations: 1872 },
      { nom: "CHD Zou-Collines", consultations: 1340 },
      { nom: "Clinique La Providence", consultations: 987 },
      { nom: "CHD Atacora-Donga", consultations: 820 },
    ],
    evolutionConsultations: [420, 385, 440, 398, 512, 476, 410],
  },
  {
    mois: "Mai 2025",
    consultations: 11920,
    patients: 82100,
    ordonnances: 8760,
    etablissements: 44,
    tauxCouverture: 60,
    topDiagnostics: [
      { code: "B50", libelle: "Paludisme a Plasmodium falciparum", count: 2104 },
      { code: "J06.9", libelle: "Infection voies respiratoires", count: 1621 },
      { code: "A09", libelle: "Gastroenterite et colite", count: 1088 },
      { code: "I10", libelle: "Hypertension arterielle", count: 912 },
      { code: "J45", libelle: "Asthme", count: 540 },
    ],
    topEtablissements: [
      { nom: "CNHU Hubert K. Maga", consultations: 3180 },
      { nom: "CHD Borgou-Alibori", consultations: 1740 },
      { nom: "CHD Zou-Collines", consultations: 1210 },
      { nom: "Clinique La Providence", consultations: 920 },
      { nom: "CHD Atacora-Donga", consultations: 798 },
    ],
    evolutionConsultations: [380, 360, 410, 390, 445, 420, 388],
  },
];

const INDICATEURS_ANNUELS = [
  { label: "Consultations YTD", valeur: "71 482", variation: "+18%", tendance: "hausse", icon: "medical_services", color: "var(--color-primary)" },
  { label: "Patients actifs", valeur: "84 320", variation: "+12%", tendance: "hausse", icon: "group", color: "var(--color-secondary)" },
  { label: "Taux de couverture", valeur: "62%", variation: "+4pts", tendance: "hausse", icon: "public", color: "var(--color-tertiary)" },
  { label: "Etablissements actifs", valeur: "45/48", variation: "=", tendance: "stable", icon: "domain", color: "var(--color-success)" },
  { label: "Ordonnances emises", valeur: "52 840", variation: "+22%", tendance: "hausse", icon: "receipt_long", color: "var(--color-primary)" },
  { label: "Alertes securite", valeur: "3", variation: "-2", tendance: "baisse_positive", icon: "security", color: "var(--color-success)" },
];

function MiniBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t transition-all"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: i === values.length - 1 ? color : color + "60",
          }}
        />
      ))}
    </div>
  );
}

export default function SuperAdminRapports() {
  const [rapportIndex, setRapportIndex] = useState(0);
  const [liveData, setLiveData] = useState<DashboardNational | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const rapport = RAPPORTS[rapportIndex];

  useEffect(() => {
    apiFetch<DashboardNational>("/dashboard/national")
      .then((d) => { setLiveData(d); setLiveLoading(false); })
      .catch(() => setLiveLoading(false));
  }, []);

  const handleExport = (format: string) => {
    alert(`Export ${format} du rapport "${rapport.mois}" — fonctionnalite disponible en production.`);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* En-tete */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Rapports nationaux
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Synthese statistique de l'activite medicale sur l'ensemble du reseau DMPI Benin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon="download" onClick={() => handleExport("PDF")}>
            PDF
          </Button>
          <Button variant="outline" size="sm" icon="table_view" onClick={() => handleExport("Excel")}>
            Excel
          </Button>
        </div>
      </div>

      {/* Donnees reelles — API */}
      <div>
        <p className="text-caption font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary)" }}>
          Donnees reelles — base de donnees
        </p>
        {liveLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container)" }} />
            ))}
          </div>
        ) : liveData ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: "folder_shared", label: "Dossiers patients", value: liveData.activite_clinique.total_dossiers_patients, color: "var(--color-primary)", sub: "MongoDB" },
              { icon: "medical_services", label: "Consultations totales", value: liveData.activite_clinique.total_consultations, color: "var(--color-secondary)", sub: "MongoDB" },
              { icon: "today", label: "Consultations (7j)", value: liveData.activite_clinique.consultations_7_derniers_jours, color: "var(--color-tertiary)", sub: "7 derniers jours" },
              { icon: "manage_accounts", label: "Utilisateurs inscrits", value: Object.values(liveData.utilisateurs_par_role).reduce((s, v) => s + v, 0), color: "var(--color-success)", sub: "PostgreSQL" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-2 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                <span className="material-symbols-outlined filled text-[20px]" style={{ color: s.color }}>{s.icon}</span>
                <p className="text-headline-sm font-bold" style={{ color: s.color }}>{s.value.toLocaleString("fr-FR")}</p>
                <div>
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{s.label}</p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            Impossible de charger les donnees en direct. Verifiez que le backend est demarre.
          </div>
        )}
      </div>

      {/* Indicateurs annuels (donnees illustratives) */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <CardHeader icon="bar_chart" title="Indicateurs cles 2025 (cumul annuel)" />
          <span className="text-caption px-2 py-1 rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--color-warning-container)", color: "var(--color-warning)" }}>
            Donnees illustratives
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {INDICATEURS_ANNUELS.map((ind) => (
            <div
              key={ind.label}
              className="flex flex-col gap-2 p-3 rounded-xl"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined filled text-[18px]" style={{ color: ind.color }}>
                  {ind.icon}
                </span>
                <span
                  className="text-caption font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      ind.tendance === "hausse"
                        ? "var(--color-primary-container)"
                        : ind.tendance === "baisse_positive"
                        ? "var(--color-success-container)"
                        : "var(--color-surface-container)",
                    color:
                      ind.tendance === "hausse"
                        ? "var(--color-primary)"
                        : ind.tendance === "baisse_positive"
                        ? "var(--color-success)"
                        : "var(--color-on-surface-variant)",
                  }}
                >
                  {ind.tendance !== "stable" && (ind.tendance === "baisse_positive" ? "↓ " : "↑ ")}
                  {ind.variation}
                </span>
              </div>
              <p className="text-headline-sm font-bold" style={{ color: ind.color }}>
                {ind.valeur}
              </p>
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                {ind.label}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Selecteur de rapport mensuel */}
      <div className="flex gap-2">
        {RAPPORTS.map((r, i) => (
          <button
            key={r.mois}
            onClick={() => setRapportIndex(i)}
            className="px-4 py-2 rounded-xl text-body-md font-semibold transition-all"
            style={
              rapportIndex === i
                ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }
                : { backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }
            }
          >
            {r.mois}
          </button>
        ))}
      </div>

      {/* Rapport mensuel details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Chiffres cles du mois */}
        <Card>
          <CardHeader icon="event_note" title={`Chiffres cles — ${rapport.mois}`} />
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "medical_services", label: "Consultations", value: rapport.consultations.toLocaleString("fr-FR"), color: "var(--color-primary)" },
              { icon: "group", label: "Patients suivis", value: rapport.patients.toLocaleString("fr-FR"), color: "var(--color-secondary)" },
              { icon: "receipt_long", label: "Ordonnances", value: rapport.ordonnances.toLocaleString("fr-FR"), color: "var(--color-tertiary)" },
              { icon: "domain", label: "Etablissements", value: rapport.etablissements, color: "var(--color-success)" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-1.5 p-3 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                <span className="material-symbols-outlined filled text-[18px]" style={{ color: s.color }}>
                  {s.icon}
                </span>
                <p className="text-headline-sm font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Mini bar chart evolution */}
          <div className="mt-4">
            <p className="text-caption mb-2" style={{ color: "var(--color-on-surface-variant)" }}>
              Evolution consultations (7 derniers jours)
            </p>
            <MiniBar values={rapport.evolutionConsultations} color="var(--color-primary)" />
          </div>
        </Card>

        {/* Top diagnostics */}
        <Card>
          <CardHeader icon="analytics" title={`Top diagnostics CIM-10 — ${rapport.mois}`} />
          <div className="flex flex-col gap-2">
            {rapport.topDiagnostics.map((d, i) => {
              const maxCount = rapport.topDiagnostics[0].count;
              const pct = Math.round((d.count / maxCount) * 100);
              return (
                <div key={d.code} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-caption font-bold flex-shrink-0"
                        style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-primary)" }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                          {d.libelle}
                        </p>
                        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                          {d.code}
                        </p>
                      </div>
                    </div>
                    <p className="text-body-md font-bold flex-shrink-0" style={{ color: "var(--color-primary)" }}>
                      {d.count.toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface-container)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: "var(--color-primary)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Top etablissements */}
      <Card>
        <CardHeader icon="leaderboard" title={`Classement etablissements par consultations — ${rapport.mois}`} />
        <div className="flex flex-col gap-3">
          {rapport.topEtablissements.map((e, i) => {
            const maxC = rapport.topEtablissements[0].consultations;
            const pct = Math.round((e.consultations / maxC) * 100);
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div key={e.nom} className="flex items-center gap-4">
                <span className="text-xl w-7 text-center flex-shrink-0">
                  {medals[i] ?? `${i + 1}.`}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {e.nom}
                    </p>
                    <p className="text-body-md font-bold" style={{ color: "var(--color-secondary)" }}>
                      {e.consultations.toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface-container)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: "var(--color-secondary)" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

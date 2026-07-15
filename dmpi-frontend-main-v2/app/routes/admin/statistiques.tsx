// Statistiques — Espace Admin Établissement
import { useEffect, useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  getStatistiquesEtablissement,
  telechargerStatistiquesPdf,
  telechargerStatistiquesExcel,
  type StatistiquesEtablissement,
} from "../../services/statistiquesEtablissementService";

export default function AdminStatistiques() {
  const [stats, setStats] = useState<StatistiquesEtablissement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exportEnCours, setExportEnCours] = useState<"pdf" | "excel" | null>(null);
  const [exportErreur, setExportErreur] = useState<string | null>(null);

  useEffect(() => {
    getStatistiquesEtablissement()
      .then(setStats)
      .catch((err) => setError((err as Error).message || "Impossible de charger les statistiques."))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (format: "pdf" | "excel") => {
    if (!stats) return;
    setExportErreur(null);
    setExportEnCours(format);
    try {
      if (format === "pdf") {
        await telechargerStatistiquesPdf(stats.annee);
      } else {
        await telechargerStatistiquesExcel(stats.annee);
      }
    } catch (err) {
      setExportErreur((err as Error).message || `Erreur lors de l'export ${format.toUpperCase()}.`);
    } finally {
      setExportEnCours(null);
    }
  };

  const maxConsultations = Math.max(...(stats?.consultations_par_mois.map((c) => c.consultations) ?? [0]), 1);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Statistiques
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            {stats ? `${stats.etablissement} · Évolution et épidémiologie` : "Évolution et épidémiologie"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon="download" loading={exportEnCours === "pdf"} disabled={!stats || exportEnCours !== null} onClick={() => handleExport("pdf")}>
              PDF
            </Button>
            <Button variant="outline" size="sm" icon="table_view" loading={exportEnCours === "excel"} disabled={!stats || exportEnCours !== null} onClick={() => handleExport("excel")}>
              Excel
            </Button>
          </div>
          {exportErreur && (
            <p className="text-caption" style={{ color: "var(--color-error)" }}>{exportErreur}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container)" }} />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
          {error}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution mensuelle */}
            <Card>
              <CardHeader icon="bar_chart" title={`Consultations par mois (${stats.annee})`} />
              <div className="flex items-end gap-2 h-40 mt-4">
                {stats.consultations_par_mois.map((c, i) => {
                  const height = Math.round((c.consultations / maxConsultations) * 100);
                  const isLast = i === stats.consultations_par_mois.length - 1;
                  return (
                    <div key={c.mois} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-caption font-semibold" style={{ color: "var(--color-primary)" }}>
                        {c.consultations}
                      </span>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${height}%`,
                          backgroundColor: isLast ? "var(--color-primary)" : "var(--color-primary-container)",
                          minHeight: "4px",
                        }}
                      />
                      <span className="text-caption text-center" style={{ color: "var(--color-on-surface-variant)" }}>
                        {c.mois.split(" ")[0].slice(0, 4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Activité par service */}
            <Card>
              <CardHeader icon="domain" title="Répartition par service" />
              {stats.activite_par_service.length === 0 ? (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucune consultation enregistrée cette année.</p>
              ) : (
                <div className="flex flex-col gap-4 mt-2">
                  {stats.activite_par_service.map((s) => (
                    <div key={s.service} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-body-md" style={{ color: "var(--color-on-surface)" }}>
                          {s.service}
                        </p>
                        <p className="text-caption font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
                          {s.consultations} · {s.pct}%
                        </p>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${s.pct}%`, backgroundColor: "var(--color-primary)" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Top diagnostics */}
          <Card>
            <CardHeader icon="diagnosis" title={`Top diagnostics — Année ${stats.annee} (CIM-10)`} />
            {stats.top_diagnostics.length === 0 ? (
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucun diagnostic enregistré cette année.</p>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {stats.top_diagnostics.map((d, i) => (
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
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${d.pct}%`, backgroundColor: i < 3 ? "var(--color-primary)" : "var(--color-secondary)" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

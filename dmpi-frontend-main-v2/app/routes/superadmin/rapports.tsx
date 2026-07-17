// Rapports Nationaux — Espace Super Admin National
import { useState, useEffect } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { apiFetch } from "../../services/api";
import {
  getRapportAnnuel,
  telechargerRapportPdf,
  telechargerRapportExcel,
  type RapportAnnuel,
  type RapportMensuel,
} from "../../services/rapportService";

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

type Tendance = "hausse" | "baisse_positive" | "stable";

interface Indicateur {
  label: string;
  valeur: string;
  variation: string;
  tendance: Tendance;
  icon: string;
  color: string;
}

function construireIndicateurs(rapport: RapportAnnuel): Indicateur[] {
  const c = rapport.cumul_annuel;

  const variationTexte = (v: number | null, suffixe = "%"): string =>
    v === null ? "—" : `${v >= 0 ? "+" : ""}${v}${suffixe}`;

  const tendanceHausse = (v: number | null): Tendance => (v === null || v === 0 ? "stable" : v > 0 ? "hausse" : "baisse_positive");

  return [
    { label: "Consultations YTD", valeur: c.consultations_ytd.toLocaleString("fr-FR"), variation: variationTexte(c.consultations_ytd_variation), tendance: tendanceHausse(c.consultations_ytd_variation), icon: "medical_services", color: "var(--color-primary)" },
    { label: "Patients actifs", valeur: c.patients_actifs.toLocaleString("fr-FR"), variation: variationTexte(c.patients_actifs_variation), tendance: tendanceHausse(c.patients_actifs_variation), icon: "group", color: "var(--color-secondary)" },
    { label: "Établissements actifs", valeur: `${c.etablissements_actifs}/${c.etablissements_total}`, variation: "=", tendance: "stable", icon: "domain", color: "var(--color-on-success-container)" },
    { label: "Prestataires partenaires actifs", valeur: `${c.prestataires_actifs}/${c.prestataires_total}`, variation: "=", tendance: "stable", icon: "storefront", color: "var(--color-tertiary)" },
    { label: "Ordonnances emises", valeur: c.ordonnances_emises.toLocaleString("fr-FR"), variation: variationTexte(c.ordonnances_emises_variation), tendance: tendanceHausse(c.ordonnances_emises_variation), icon: "receipt_long", color: "var(--color-primary)" },
    { label: "Demandes d'examen emises", valeur: c.demandes_examen_emises.toLocaleString("fr-FR"), variation: variationTexte(c.demandes_examen_emises_variation), tendance: tendanceHausse(c.demandes_examen_emises_variation), icon: "lab_panel", color: "var(--color-secondary)" },
  ];
}

function CouleurTendance(tendance: Tendance) {
  return {
    backgroundColor:
      tendance === "hausse" ? "var(--color-primary-container)" : tendance === "baisse_positive" ? "var(--color-success-container)" : "var(--color-surface-container)",
    color:
      tendance === "hausse" ? "var(--color-on-primary-container)" : tendance === "baisse_positive" ? "var(--color-on-success-container)" : "var(--color-on-surface-variant)",
  };
}

/** Arrondit à une valeur "ronde" au-dessus de la valeur donnée, pour des graduations lisibles (10, 20, 50, 100, 200...). */
function echelleLisible(valeur: number): number {
  if (valeur <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(valeur)));
  const normalise = valeur / magnitude;
  const palier = normalise <= 1 ? 1 : normalise <= 2 ? 2 : normalise <= 5 ? 5 : 10;
  return palier * magnitude;
}

function EvolutionAnnuelle({ rapports }: { rapports: RapportMensuel[] }) {
  const chronologique = [...rapports].reverse();

  // Une courbe/barre n'a de sens qu'avec au moins deux points à comparer —
  // avec un seul mois, une barre unique s'étirait sur toute la largeur et
  // toute la hauteur (100% de son propre maximum), ce qui ressemblait à un
  // bloc plein cassé plutôt qu'à un graphique.
  if (chronologique.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-32 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
        <span className="material-symbols-outlined text-[28px] opacity-40">show_chart</span>
        <p className="text-body-md">
          Historique insuffisant pour tracer une évolution — la courbe apparaîtra à partir du deuxième mois d'activité.
        </p>
      </div>
    );
  }

  const valeurMax = Math.max(...chronologique.map((r) => r.consultations), 1);
  const axeMax = echelleLisible(valeurMax);
  const nbGraduations = 5;
  const graduations = Array.from({ length: nbGraduations + 1 }, (_, i) => Math.round((axeMax / nbGraduations) * i));

  // Repères géométriques du SVG (unités arbitraires, mises à l'échelle par viewBox).
  const largeur = 720;
  const hauteur = 260;
  const margeGauche = 44;
  const margeDroite = 12;
  const margeHaut = 16;
  const margeBas = 28;
  const largeurTrace = largeur - margeGauche - margeDroite;
  const hauteurTrace = hauteur - margeHaut - margeBas;

  const largeurCase = largeurTrace / chronologique.length;
  const largeurBarre = Math.min(largeurCase * 0.5, 46);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="w-full min-w-120" style={{ height: "260px" }} role="img" aria-label="Évolution des consultations sur l'année">
        {/* Grille + graduations de l'axe des ordonnées */}
        {graduations.map((g) => {
          const y = margeHaut + hauteurTrace - (g / axeMax) * hauteurTrace;
          return (
            <g key={g}>
              <line x1={margeGauche} y1={y} x2={largeur - margeDroite} y2={y} stroke="var(--color-outline-variant)" strokeWidth={1} />
              <text x={margeGauche - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="var(--color-on-surface-variant)">
                {g.toLocaleString("fr-FR")}
              </text>
            </g>
          );
        })}

        {/* Axe des abscisses */}
        <line x1={margeGauche} y1={margeHaut + hauteurTrace} x2={largeur - margeDroite} y2={margeHaut + hauteurTrace} stroke="var(--color-outline)" strokeWidth={1.5} />

        {/* Barres + libellés des mois + valeurs */}
        {chronologique.map((r, i) => {
          const centreX = margeGauche + largeurCase * i + largeurCase / 2;
          const barreX = centreX - largeurBarre / 2;
          const barreHauteur = axeMax > 0 ? (r.consultations / axeMax) * hauteurTrace : 0;
          const barreY = margeHaut + hauteurTrace - barreHauteur;
          return (
            <g key={r.mois}>
              <rect x={barreX} y={barreY} width={largeurBarre} height={Math.max(barreHauteur, 1)} fill="var(--color-primary)" rx={2} />
              <text x={centreX} y={barreY - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-on-surface)">
                {r.consultations}
              </text>
              <text x={centreX} y={margeHaut + hauteurTrace + 18} textAnchor="middle" fontSize="11" fill="var(--color-on-surface-variant)">
                {r.mois.split(" ")[0].slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function BarreRepartition({ label, sousLabel, valeur, max, color }: { label: string; sousLabel: string; valeur: number; max: number; color: string }) {
  const pct = Math.round((valeur / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{label}</p>
          <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{sousLabel}</p>
        </div>
        <p className="text-body-md font-bold flex-shrink-0" style={{ color }}>{valeur.toLocaleString("fr-FR")}</p>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-surface-container)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function SuperAdminRapports() {
  const [rapportIndex, setRapportIndex] = useState(0);
  const [liveData, setLiveData] = useState<DashboardNational | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  const [rapportAnnuel, setRapportAnnuel] = useState<RapportAnnuel | null>(null);
  const [rapportLoading, setRapportLoading] = useState(true);
  const [rapportError, setRapportError] = useState<string | null>(null);

  const [exportEnCours, setExportEnCours] = useState<"pdf" | "excel" | null>(null);
  const [exportErreur, setExportErreur] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<DashboardNational>("/dashboard/national")
      .then((d) => { setLiveData(d); setLiveLoading(false); })
      .catch(() => setLiveLoading(false));
  }, []);

  useEffect(() => {
    getRapportAnnuel()
      .then((d) => { setRapportAnnuel(d); setRapportLoading(false); })
      .catch((err) => { setRapportError((err as Error).message || "Impossible de charger le rapport annuel."); setRapportLoading(false); });
  }, []);

  const rapport = rapportAnnuel?.rapports_mensuels[rapportIndex];

  const handleExport = async (format: "pdf" | "excel") => {
    if (!rapportAnnuel) return;
    setExportErreur(null);
    setExportEnCours(format);
    try {
      if (format === "pdf") {
        await telechargerRapportPdf(rapportAnnuel.annee);
      } else {
        await telechargerRapportExcel(rapportAnnuel.annee);
      }
    } catch (err) {
      setExportErreur((err as Error).message || `Erreur lors de l'export ${format.toUpperCase()}.`);
    } finally {
      setExportEnCours(null);
    }
  };

  const alertes = rapportAnnuel?.cumul_annuel.alertes_securite ?? 0;
  const alertesVariation = rapportAnnuel?.cumul_annuel.alertes_securite_variation ?? 0;
  const alertesCouleur = alertes === 0
    ? { bg: "var(--color-success-container)", fg: "var(--color-on-success-container)" }
    : { bg: "var(--color-warning-container)", fg: "var(--color-on-warning-container)" };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* En-tete */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Rapports nationaux
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Synthèse statistique de l'activité médicale sur l'ensemble du réseau DMPI Bénin.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon="download" loading={exportEnCours === "pdf"} disabled={!rapportAnnuel || exportEnCours !== null} onClick={() => handleExport("pdf")}>
              PDF
            </Button>
            <Button variant="outline" size="sm" icon="table_view" loading={exportEnCours === "excel"} disabled={!rapportAnnuel || exportEnCours !== null} onClick={() => handleExport("excel")}>
              Excel
            </Button>
          </div>
          {exportErreur && (
            <p className="text-caption" style={{ color: "var(--color-error)" }}>{exportErreur}</p>
          )}
        </div>
      </div>

      {/* Vue d'ensemble — fusion des donnees "depuis le lancement" et "cette annee" */}
      <Card>
        <CardHeader icon="dashboard" title="Vue d'ensemble" />

        <p className="text-caption font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-on-surface-variant)" }}>
          Depuis le lancement
        </p>
        {liveLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container)" }} />
            ))}
          </div>
        ) : liveData ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {[
              { icon: "folder_shared", label: "Dossiers patients", value: liveData.activite_clinique.total_dossiers_patients, color: "var(--color-on-surface-variant)" },
              { icon: "manage_accounts", label: "Utilisateurs inscrits", value: Object.values(liveData.utilisateurs_par_role).reduce((s, v) => s + v, 0), color: "var(--color-on-surface-variant)" },
              { icon: "today", label: "Consultations (7 derniers jours)", value: liveData.activite_clinique.consultations_7_derniers_jours, color: "var(--color-on-surface-variant)" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <p className="text-body-md font-bold" style={{ color: "var(--color-on-surface)" }}>{s.value.toLocaleString("fr-FR")}</p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl text-body-md mb-5" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            Impossible de charger les données en direct. Vérifiez que le backend est démarré.
          </div>
        )}

        <p className="text-caption font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-primary)" }}>
          {rapportAnnuel ? `Cette année (${rapportAnnuel.annee})` : "Cette année"}
        </p>
        {rapportLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
            ))}
          </div>
        ) : rapportError ? (
          <div className="p-4 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            {rapportError}
          </div>
        ) : rapportAnnuel ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {construireIndicateurs(rapportAnnuel).map((ind) => {
              const couleur = CouleurTendance(ind.tendance);
              return (
                <div key={ind.label} className="flex flex-col gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined filled text-[18px]" style={{ color: ind.color }}>{ind.icon}</span>
                    <span className="text-caption font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: couleur.backgroundColor, color: couleur.color }}>
                      {ind.tendance !== "stable" && (ind.tendance === "baisse_positive" ? "↓ " : "↑ ")}
                      {ind.variation}
                    </span>
                  </div>
                  <p className="text-headline-sm font-bold" style={{ color: ind.color }}>{ind.valeur}</p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{ind.label}</p>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>

      {/* Alertes securite — encart distinct, ce n'est pas une statistique d'activite clinique */}
      {rapportAnnuel && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: alertesCouleur.bg }}>
          <span className="material-symbols-outlined filled text-[24px]" style={{ color: alertesCouleur.fg }}>security</span>
          <div>
            <p className="text-body-md font-bold" style={{ color: alertesCouleur.fg }}>
              {alertes} alerte{alertes !== 1 ? "s" : ""} de sécurité cette année
            </p>
            <p className="text-caption" style={{ color: alertesCouleur.fg }}>
              {alertesVariation === 0 ? "Stable" : alertesVariation < 0 ? `${Math.abs(alertesVariation)} de moins` : `${alertesVariation} de plus`} par rapport à la même période l'an dernier
            </p>
          </div>
        </div>
      )}

      {!rapportLoading && !rapportError && rapportAnnuel && rapportAnnuel.rapports_mensuels.length === 0 && (
        <div className="p-4 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-surface-container-low)", color: "var(--color-on-surface-variant)" }}>
          Aucune consultation enregistrée pour l'année {rapportAnnuel.annee} — les statistiques détaillées apparaîtront dès la première consultation.
        </div>
      )}

      {rapportAnnuel && rapportAnnuel.rapports_mensuels.length > 0 && (
        <>
          {/* Evolution annuelle */}
          <Card>
            <CardHeader icon="trending_up" title="Évolution des consultations sur l'année" />
            <EvolutionAnnuelle rapports={rapportAnnuel.rapports_mensuels} />
          </Card>

          {/* Repartitions departement / type d'etablissement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader icon="map" title="Répartition par département" />
              {rapportAnnuel.repartition_departements.length === 0 ? (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucune donnée disponible.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {rapportAnnuel.repartition_departements.map((d) => (
                    <BarreRepartition
                      key={d.departement}
                      label={d.departement}
                      sousLabel={`${d.patients.toLocaleString("fr-FR")} patients · ${d.etablissements_actifs}/${d.etablissements_total} établissements actifs`}
                      valeur={d.consultations}
                      max={rapportAnnuel.repartition_departements[0].consultations}
                      color="var(--color-primary)"
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader icon="domain" title="Répartition par type d'établissement" />
              {rapportAnnuel.repartition_types_etablissement.length === 0 ? (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucune donnée disponible.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {rapportAnnuel.repartition_types_etablissement.map((t) => (
                    <BarreRepartition
                      key={t.type}
                      label={t.type}
                      sousLabel={`${t.etablissements} établissement${t.etablissements !== 1 ? "s" : ""}`}
                      valeur={t.consultations}
                      max={rapportAnnuel.repartition_types_etablissement[0].consultations}
                      color="var(--color-secondary)"
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {rapport && (
        <>
          {/* Selecteur de rapport mensuel */}
          <div className="flex gap-2 flex-wrap">
            {rapportAnnuel!.rapports_mensuels.map((r, i) => (
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
            {/* Chiffres clés du mois */}
            <Card>
              <CardHeader icon="event_note" title={`Chiffres clés — ${rapport.mois}`} />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "medical_services", label: "Consultations", value: rapport.consultations.toLocaleString("fr-FR"), color: "var(--color-primary)" },
                  { icon: "group", label: "Patients suivis", value: rapport.patients.toLocaleString("fr-FR"), color: "var(--color-secondary)" },
                  { icon: "receipt_long", label: "Ordonnances", value: rapport.ordonnances.toLocaleString("fr-FR"), color: "var(--color-tertiary)" },
                  { icon: "lab_panel", label: "Demandes d'examen", value: rapport.demandesExamen.toLocaleString("fr-FR"), color: "var(--color-secondary)" },
                  { icon: "domain", label: "Établissements", value: rapport.etablissements, color: "var(--color-on-success-container)" },
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
            </Card>

            {/* Top diagnostics */}
            <Card>
              <CardHeader icon="analytics" title={`Top diagnostics CIM-10 — ${rapport.mois}`} />
              {rapport.topDiagnostics.length === 0 ? (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucun diagnostic enregistré ce mois-ci.</p>
              ) : (
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
                              style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary-container)" }}
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
              )}
            </Card>
          </div>

          {/* Top etablissements */}
          <Card>
            <CardHeader icon="leaderboard" title={`Classement établissements par consultations — ${rapport.mois}`} />
            {rapport.topEtablissements.length === 0 ? (
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucune consultation rattachée à un établissement ce mois-ci.</p>
            ) : (
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
            )}
          </Card>
        </>
      )}
    </div>
  );
}

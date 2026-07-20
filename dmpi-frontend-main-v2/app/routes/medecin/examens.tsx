// Mes examens prescrits — Espace Médecin
// Vue d'ensemble tous patients confondus : sans elle, savoir si un résultat
// est arrivé exige de rouvrir chaque dossier patient un par un.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import Card, { CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Pagination from "../../components/ui/Pagination";
import { getMesPrescriptionsExamen, getMesPrescriptionsExamenPaginee, type DemandeExamen } from "../../services/demandeExamenService";
import { formatDateFr } from "../../services/patientService";

const TAILLE_PAGE = 10;

function LigneExamen({ demande: d }: { demande: DemandeExamen }) {
  return (
    <li>
      <Link
        to={`/medecin/dossier/${d.npi}`}
        className="flex items-start justify-between gap-3 p-4 rounded-xl transition-colors hover:bg-[var(--color-surface-container)]"
        style={{ backgroundColor: "var(--color-surface-container-low)" }}
      >
        <div className="min-w-0">
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
            {d.type_examen}
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            NPI {d.npi} · {d.prestataire_nom ?? "Laboratoire"} · prescrit le {formatDateFr(d.created_at)}
          </p>
          {d.probleme_signale && d.motif_probleme && (
            <p className="text-caption mt-1" style={{ color: "var(--color-error)" }}>
              ⚠ {d.motif_probleme}
            </p>
          )}
        </div>
        {d.statut === "traitee" ? (
          <Badge variant="success" icon="task_alt">Reçu</Badge>
        ) : d.probleme_signale ? (
          <Badge variant="error" icon="report">Problème signalé</Badge>
        ) : (
          <Badge variant="warning" icon="pending_actions">En attente</Badge>
        )}
      </Link>
    </li>
  );
}

export default function MedecinExamens() {
  const [enCours, setEnCours] = useState<DemandeExamen[]>([]);
  const [traitees, setTraitees] = useState<DemandeExamen[]>([]);
  const [totalTraitees, setTotalTraitees] = useState<number | null>(null);
  const [pageTraitees, setPageTraitees] = useState(1);
  const [loadingEnCours, setLoadingEnCours] = useState(true);
  const [loadingTraitees, setLoadingTraitees] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingEnCours(true);
    getMesPrescriptionsExamen("en_attente").then((res) => {
      if (!cancelled) {
        setEnCours(res);
        setLoadingEnCours(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingTraitees(true);
    getMesPrescriptionsExamenPaginee((pageTraitees - 1) * TAILLE_PAGE, TAILLE_PAGE, "traitee").then((res) => {
      if (!cancelled) {
        setTraitees(res.items);
        setTotalTraitees(res.total);
        setLoadingTraitees(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pageTraitees]);

  const loading = loadingEnCours || loadingTraitees;
  const avecProbleme = enCours.filter((d) => d.probleme_signale);
  const enAttente = enCours.filter((d) => !d.probleme_signale);
  const totalPagesTraitees = Math.max(1, Math.ceil((totalTraitees ?? 0) / TAILLE_PAGE));
  const demandes = [...enCours, ...traitees];

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes examens prescrits
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Tous les examens que vous avez prescrits, tous patients confondus.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Chargement…" />
        </div>
      ) : demandes.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 py-10 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-5xl opacity-40">biotech</span>
            <p className="text-body-md">Vous n'avez prescrit aucun examen pour le moment.</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {avecProbleme.length > 0 && (
            <Card accentBorder="border-l-4 border-[var(--color-error)]">
              <CardHeader icon="report" title={`Problème signalé (${avecProbleme.length})`} />
              <ul className="flex flex-col gap-3">
                {avecProbleme.map((d) => (
                  <LigneExamen key={d.id} demande={d} />
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader icon="pending_actions" title={`En attente de résultat (${enAttente.length})`} />
            {enAttente.length === 0 ? (
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                Aucune demande en attente.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {enAttente.map((d) => (
                  <LigneExamen key={d.id} demande={d} />
                ))}
              </ul>
            )}
          </Card>

          {traitees.length > 0 && (
            <Card>
              <CardHeader icon="task_alt" title={`Résultats reçus (${totalTraitees ?? traitees.length})`} />
              <ul className="flex flex-col gap-2">
                {traitees.map((d) => (
                  <LigneExamen key={d.id} demande={d} />
                ))}
              </ul>
              <Pagination page={pageTraitees} totalPages={totalPagesTraitees} onPageChange={setPageTraitees} totalItems={totalTraitees} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

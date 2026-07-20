// Journal d'audit — Espace Super Admin
import { useState, useEffect } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Pagination from "../../components/ui/Pagination";
import { getJournalAudit, type AuditEntry } from "../../services/auditService";

const TAILLE_PAGE = 10;

const ACTION_LABELS: Record<string, string> = {
  SIGN_CONSULTATION: "Signature consultation",
  CREATION_COMPTE_MEDECIN: "Création compte médecin",
  CREATION_COMPTE_INFIRMIER: "Création compte infirmier",
  CREATION_COMPTE_ADMIN_ETABLISSEMENT: "Création compte admin",
  ACTIVATION_COMPTE: "Activation compte",
  DESACTIVATION_COMPTE: "Désactivation compte",
  MODIFICATION_COMPTE: "Modification compte",
  CONSULTATION_JOURNAL_AUDIT: "Lecture logs d'audit",
  CREATE_PRESCRIPTION: "Création ordonnance",
  LOGIN_FAILED: "Tentative connexion échouée",
  LOGIN_SUCCESS: "Connexion réussie",
  EXPORT_STATS: "Export statistiques",
  RECORD_CONSTANTES: "Relevé constantes",
  AUTO_BACKUP: "Sauvegarde automatique",
  SYNC_FAILED: "Synchronisation échouée",
};

const STATUT_CONFIG: Record<string, {label: string, color: string, bg: string, icon: string}> = {
  SUCCES: { label: "Succès", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  ECHEC: { label: "Échec", color: "var(--color-on-error-container)", bg: "var(--color-error-container)", icon: "cancel" },
  ALERTE: { label: "Alerte", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "warning" },
};

export default function SuperAdminAudit() {
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<"tous" | "SUCCES" | "ECHEC" | "ALERTE">("tous");
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Revenir à la première page à chaque changement de filtre de statut —
  // sinon une page devenue hors limites afficherait une liste vide à tort.
  useEffect(() => { setPage(1); }, [filterStatut]);

  useEffect(() => {
    setLoading(true);
    getJournalAudit((page - 1) * TAILLE_PAGE, TAILLE_PAGE, {
      statutAction: filterStatut === "tous" ? undefined : filterStatut,
    })
      .then(({ items, total: totalRecu }) => {
        setLogs(items);
        setTotal(totalRecu);
      })
      .catch((err) => {
        console.error("Erreur chargement logs:", err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [page, filterStatut]);

  // Le journal complet grossit indéfiniment (append-only) : la recherche ne
  // porte donc que sur la page actuellement chargée, pas sur l'ensemble —
  // filtrer par statut ou par NPI (backend) reste le moyen fiable de
  // retrouver un événement précis en dehors de la page courante.
  const filtered = logs.filter((e) => {
    const q = search.toLowerCase();
    if (!q) return true;

    const userStr = e.utilisateur_nom_complet ? e.utilisateur_nom_complet.toLowerCase() : "";
    const emailStr = e.utilisateur_email ? e.utilisateur_email.toLowerCase() : "";
    const actStr = e.action.toLowerCase();
    const lblStr = ACTION_LABELS[e.action] ? ACTION_LABELS[e.action].toLowerCase() : "";
    const npiStr = e.npi_concerne ? e.npi_concerne.toLowerCase() : "";

    return (
      userStr.includes(q) ||
      emailStr.includes(q) ||
      actStr.includes(q) ||
      lblStr.includes(q) ||
      npiStr.includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / TAILLE_PAGE));

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Journal d'audit
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Traçabilité complète des actions effectuées sur la plateforme DMPI.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Filtrer cette page par utilisateur, action ou cible…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leadingIcon="search"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["tous", "SUCCES", "ECHEC", "ALERTE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              className="px-4 py-2 rounded-xl text-body-md font-semibold transition-all capitalize"
              style={
                filterStatut === s
                  ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }
                  : { backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }
              }
            >
              {s === "tous" ? "Tous" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader icon="policy" title={`Événements`} />
        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="py-8 text-center text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Chargement des logs...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Aucun événement trouvé.
            </div>
          ) : (
            filtered.map((e) => {
              const statut = STATUT_CONFIG[e.statut_action.toUpperCase()] || STATUT_CONFIG["ALERTE"];
              return (
                <div
                  key={e.id}
                  className="flex items-start gap-3 p-3 rounded-xl border"
                  style={{
                    borderColor: e.statut_action.toUpperCase() !== "SUCCES" ? statut.bg : "var(--color-outline-variant)",
                    backgroundColor: e.statut_action.toUpperCase() !== "SUCCES" ? statut.bg + "60" : "var(--color-surface-container-low)",
                  }}
                >
                  <span
                    className="material-symbols-outlined filled text-[18px] shrink-0 mt-0.5"
                    style={{ color: statut.color }}
                  >
                    {statut.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        {ACTION_LABELS[e.action] ?? e.action}
                      </p>
                      <span
                        className="text-caption font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: statut.bg, color: statut.color }}
                      >
                        {statut.label}
                      </span>
                    </div>
                    <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                      {e.utilisateur_nom_complet || e.utilisateur_email}
                      {e.utilisateur_role && ` · ${e.utilisateur_role}`}
                    </p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      Cible : {e.npi_concerne || "N/A"} · IP : {e.adresse_ip || "Inconnue"}
                    </p>
                  </div>
                  <p className="text-caption shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>
                    {new Date(e.horodatage).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    <br />
                    {new Date(e.horodatage).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </div>
              );
            })
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} />
      </Card>
    </div>
  );
}

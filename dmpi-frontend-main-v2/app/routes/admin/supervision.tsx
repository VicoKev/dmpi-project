// Supervision des utilisateurs — Espace Admin Établissement
import { useState, useEffect } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { getUsersMonEtablissement, type User as Utilisateur } from "../../services/userService";

const STATUT_CONFIG = {
  actif: { label: "En service", color: "var(--color-on-success-container)", bg: "var(--color-success-container)" },
  inactif: { label: "Inactif", color: "var(--color-outline)", bg: "var(--color-surface-container)" },
};

const ROLE_LABELS: Record<string, string> = {
  medecin: "Médecin",
  infirmier: "Infirmier(e)",
  admin_etablissement: "Admin",
};

export default function AdminSupervision() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"tous" | "medecin" | "infirmier">("tous");
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsersMonEtablissement()
      .then((data) => {
        setUsers(data.filter((u) => u.role === "medecin" || u.role === "infirmier"));
      })
      .catch((err) => {
        setError((err as Error).message || "Impossible de charger le personnel.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchRole = filterRole === "tous" || u.role === filterRole;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Supervision du personnel
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Vue d'ensemble des médecins et infirmiers de l'établissement.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, prénom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leadingIcon="search"
          />
        </div>
        <div className="flex gap-2">
          {(["tous", "medecin", "infirmier"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className="px-4 py-2 rounded-xl text-body-md font-semibold transition-all"
              style={
                filterRole === r
                  ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" }
                  : { backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }
              }
            >
              {r === "tous" ? "Tous" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader
          icon="groups"
          title={`Personnel (${filtered.length})`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
                <th className="py-3 px-4 text-label-lg" style={{ color: "var(--color-on-surface-variant)" }}>
                  Nom & Prénom
                </th>
                <th className="py-3 px-4 text-label-lg" style={{ color: "var(--color-on-surface-variant)" }}>
                  Rôle
                </th>
                <th className="py-3 px-4 text-label-lg" style={{ color: "var(--color-on-surface-variant)" }}>
                  Spécialité / Service
                </th>
                <th className="py-3 px-4 text-label-lg" style={{ color: "var(--color-on-surface-variant)" }}>
                  Statut
                </th>
                <th className="py-3 px-4 text-label-lg" style={{ color: "var(--color-on-surface-variant)" }}>
                  Dernière connexion
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                    Chargement...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-body-md" style={{ color: "var(--color-error)" }}>
                    {error}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const statutKey = u.est_actif ? "actif" : "inactif";
                  const statut = STATUT_CONFIG[statutKey];
                  return (
                    <tr
                      key={u.id}
                      className="border-b hover:bg-[var(--color-surface-container-low)] transition-colors"
                      style={{ borderColor: "var(--color-outline-variant)" }}
                    >
                      <td className="py-3 px-4">
                        <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                          {u.nom} {u.prenom}
                        </p>
                        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                          {u.email}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-body-md" style={{ color: "var(--color-on-surface)" }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                          {u.specialite || u.service || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2 py-1 rounded-full text-caption font-semibold flex items-center w-fit gap-1.5"
                          style={{
                            backgroundColor: statut.bg,
                            color: statut.color,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: statut.color }}
                          />
                          {statut.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                          {u.derniere_connexion
                            ? new Date(u.derniere_connexion).toLocaleString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Jamais connecté"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// Demandes d'accès portail patient — Espace Super Admin National
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import {
  getDemandesAcces,
  rejeterDemandeAcces,
  type DemandeAcces,
} from "../../services/demandeAccesService";

export default function SuperAdminDemandesAcces() {
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState<DemandeAcces[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectingDemande, setRejectingDemande] = useState<DemandeAcces | null>(null);
  const [motifRejet, setMotifRejet] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDemandes(await getDemandesAcces("en_attente"));
    } catch (err) {
      setError((err as Error).message || "Impossible de charger les demandes d'accès.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreerCompte = (demande: DemandeAcces) => {
    const params = new URLSearchParams({
      npi: demande.npi,
      nom: demande.nom,
      prenom: demande.prenom,
    });
    navigate(`/superadmin/utilisateurs?${params.toString()}`);
  };

  const ouvrirRejet = (demande: DemandeAcces) => {
    setRejectingDemande(demande);
    setMotifRejet("");
  };

  const confirmerRejet = async () => {
    if (!rejectingDemande) return;
    setRejectingId(rejectingDemande.id);
    try {
      await rejeterDemandeAcces(rejectingDemande.id, motifRejet);
      setDemandes((prev) => prev.filter((d) => d.id !== rejectingDemande.id));
      setRejectingDemande(null);
    } catch (err) {
      alert((err as Error).message || "Erreur lors du rejet.");
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Demandes d'accès patient
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Un médecin ou infirmier a signalé qu'un patient (dossier déjà existant) souhaite
          un compte de connexion. Créez le compte pour clôturer automatiquement la demande,
          ou rejetez-la.
        </p>
      </div>

      <Card>
        <CardHeader icon="how_to_reg" title={`${demandes.length} demande(s) en attente`} />

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
            <button className="ml-auto underline text-body-md" onClick={load}>Réessayer</button>
          </div>
        ) : demandes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-5xl opacity-40">task_alt</span>
            <p className="text-body-md">Aucune demande d'accès en attente.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {demandes.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              >
                <div className="min-w-0">
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {d.prenom} {d.nom}
                    <span className="text-caption font-normal ml-2" style={{ color: "var(--color-on-surface-variant)" }}>
                      NPI {d.npi}
                    </span>
                  </p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    Contact {d.telephone_contact} · Demandé par {d.demandeur_email} le{" "}
                    {new Date(d.date_creation).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    icon="block"
                    variant="outline"
                    size="sm"
                    onClick={() => ouvrirRejet(d)}
                    loading={rejectingId === d.id}
                  >
                    Rejeter
                  </Button>
                  <Button icon="person_add" size="sm" onClick={() => handleCreerCompte(d)}>
                    Créer le compte
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Modale de rejet */}
      {rejectingDemande && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h2 className="text-headline-sm font-bold mb-1" style={{ color: "var(--color-on-surface)" }}>
              Rejeter la demande
            </h2>
            <p className="text-body-md mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
              {rejectingDemande.prenom} {rejectingDemande.nom} — NPI {rejectingDemande.npi}
            </p>

            <div className="flex flex-col gap-1 mb-1">
              <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>
                Motif du rejet (optionnel)
              </label>
              <textarea
                value={motifRejet}
                onChange={(e) => setMotifRejet(e.target.value)}
                rows={3}
                placeholder="Ex : numéro de téléphone invalide, à vérifier avec le patient..."
                className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
                style={{
                  borderColor: "var(--color-outline-variant)",
                  backgroundColor: "var(--color-surface-container-lowest)",
                  color: "var(--color-on-surface)",
                }}
              />
              <p className="text-caption mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
                Visible par le médecin/infirmier à l'origine de la demande.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                type="button"
                onClick={() => setRejectingDemande(null)}
                disabled={rejectingId !== null}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                icon="block"
                onClick={confirmerRejet}
                loading={rejectingId === rejectingDemande.id}
              >
                Rejeter la demande
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

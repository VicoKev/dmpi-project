// Suivi des demandes d'accès portail soumises par le médecin/infirmier connecté
import { useState, useEffect, useCallback } from "react";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useToast } from "../../contexts/ToastContext";
import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  getMesDemandesAcces,
  annulerDemandeAcces,
  type DemandeAcces,
} from "../../services/demandeAccesService";

const STATUT_CONFIG: Record<DemandeAcces["statut"], { label: string; color: string; bg: string; icon: string }> = {
  en_attente: { label: "En attente", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "hourglass_empty" },
  traite: { label: "Compte créé", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  rejete: { label: "Rejetée", color: "var(--color-on-error-container)", bg: "var(--color-error-container)", icon: "cancel" },
  annulee: { label: "Annulée", color: "var(--color-on-surface-variant)", bg: "var(--color-surface-container)", icon: "block" },
};

export default function MesDemandesAccesList() {
  const [demandes, setDemandes] = useState<DemandeAcces[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const askConfirmation = useConfirm();
  const showToast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDemandes(await getMesDemandesAcces());
    } catch (err) {
      setError((err as Error).message || "Impossible de charger vos demandes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAnnuler = async (demande: DemandeAcces) => {
    const ok = await askConfirmation({
      title: "Annuler la demande",
      message: `Annuler la demande d'accès de ${demande.prenom} ${demande.nom} ?`,
      confirmLabel: "Annuler la demande",
      variant: "danger",
    });
    if (!ok) return;
    setCancelingId(demande.id);
    try {
      const updated = await annulerDemandeAcces(demande.id);
      setDemandes((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      showToast((err as Error).message || "Erreur lors de l'annulation.", "error");
    } finally {
      setCancelingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
        <span className="material-symbols-outlined">error</span>
        <span>{error}</span>
        <button className="ml-auto underline text-body-md" onClick={load}>Réessayer</button>
      </div>
    );
  }

  if (demandes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
        <span className="material-symbols-outlined text-5xl opacity-40">how_to_reg</span>
        <p className="text-body-md">Vous n'avez soumis aucune demande d'accès pour le moment.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {demandes.map((d) => {
        const cfg = STATUT_CONFIG[d.statut] ?? STATUT_CONFIG.en_attente;
        return (
          <li
            key={d.id}
            className="flex flex-col gap-2 p-4 rounded-xl"
            style={{ backgroundColor: "var(--color-surface-container-low)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {d.prenom} {d.nom}
                  <span className="text-caption font-normal ml-2" style={{ color: "var(--color-on-surface-variant)" }}>
                    NPI {d.npi}
                  </span>
                </p>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  Contact {d.telephone_contact} · Soumise le{" "}
                  {new Date(d.date_creation).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-caption font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                  {cfg.label}
                </span>
                {d.statut === "en_attente" && (
                  <Button
                    icon="close"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnnuler(d)}
                    loading={cancelingId === d.id}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </div>

            {d.statut === "rejete" && d.motif_rejet && (
              <div
                className="p-3 rounded-xl text-body-md"
                style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}
              >
                <span className="font-semibold">Motif du rejet : </span>{d.motif_rejet}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

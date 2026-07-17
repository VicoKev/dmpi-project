// Agenda médecin — Planification et gestion des rendez-vous
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatutBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Spinner from "../../components/ui/Spinner";
import {
  getRdvByMedecin,
  createRdv,
  annulerRdv,
  isRdvPasse,
  formatRdvDate,
  formatRdvTime,
  type RendezVous,
} from "../../services/rdvService";
import { getPatientByNpi, validateNpi } from "../../services/patientService";
import type { PatientSearchResult } from "../../types/patient";

const STATUT_CFG = {
  confirme: { label: "Confirmé", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  annule:   { label: "Annulé",   color: "var(--color-error)",   bg: "var(--color-error-container)",   icon: "cancel" },
  complete: { label: "Effectué", color: "var(--color-outline)", bg: "var(--color-surface-container)", icon: "task_alt" },
};

// ─── Formulaire création RDV ─────────────────────────────────────────────────

interface FormNouveauRdv {
  npiInput: string;
  patient: PatientSearchResult | null;
  searchError: string | null;
  searching: boolean;
  dateRdv: string;
  heureRdv: string;
  motif: string;
  notes: string;
  submitting: boolean;
  submitError: string | null;
}

function NouveauRdvForm({ onCreated }: { onCreated: (rdv: RendezVous) => void }) {
  const [form, setForm] = useState<FormNouveauRdv>({
    npiInput: "",
    patient: null,
    searchError: null,
    searching: false,
    dateRdv: "",
    heureRdv: "08:00",
    motif: "",
    notes: "",
    submitting: false,
    submitError: null,
  });

  const update = (patch: Partial<FormNouveauRdv>) =>
    setForm((p) => ({ ...p, ...patch }));

  const rechercherPatient = async () => {
    const npi = form.npiInput.trim();
    if (!validateNpi(npi)) {
      update({ searchError: "Le NPI doit contenir exactement 10 chiffres." });
      return;
    }
    update({ searching: true, searchError: null, patient: null });
    const res = await getPatientByNpi(npi);
    if (!res) {
      update({ searching: false, searchError: "Aucun dossier trouvé pour ce NPI." });
    } else {
      update({ searching: false, patient: res });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient || !form.dateRdv || !form.motif.trim()) return;

    update({ submitting: true, submitError: null });
    try {
      const dateIso = `${form.dateRdv}T${form.heureRdv}:00`;
      await createRdv({
        npi_patient: form.patient.npi,
        nom_patient: form.patient.nom,
        prenom_patient: form.patient.prenom,
        date_rdv: dateIso,
        motif: form.motif.trim(),
        notes: form.notes.trim() || undefined,
      });

      // Refresh: on refetch depuis l'API pour avoir l'_id
      update({
        submitting: false,
        npiInput: "",
        patient: null,
        dateRdv: "",
        heureRdv: "08:00",
        motif: "",
        notes: "",
      });
      // Notify parent to refresh list
      onCreated({} as RendezVous);
    } catch (err) {
      update({ submitting: false, submitError: (err as Error).message || "Erreur lors de la création." });
    }
  };

  return (
    <Card>
      <CardHeader icon="event_available" title="Nouveau rendez-vous" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
        {/* Recherche patient */}
        <div className="flex flex-col gap-1">
          <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>
            NPI du patient
          </label>
          <div className="flex gap-2">
            <Input
              id="npi-rdv"
              placeholder="10 chiffres"
              value={form.npiInput}
              onChange={(e) => update({ npiInput: e.target.value, patient: null, searchError: null })}
              maxLength={10}
            />
            <Button
              type="button"
              variant="outline"
              onClick={rechercherPatient}
              disabled={form.searching}
            >
              {form.searching ? "…" : "Rechercher"}
            </Button>
          </div>
          {form.searchError && (
            <p className="text-caption" style={{ color: "var(--color-error)" }}>{form.searchError}</p>
          )}
          {form.patient && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl mt-1"
              style={{ backgroundColor: "var(--color-success-container)", color: "var(--color-on-success-container)" }}
            >
              <span className="material-symbols-outlined filled text-[18px]">person_check</span>
              <span className="text-body-md font-semibold">
                {form.patient.prenom} {form.patient.nom} — NPI {form.patient.npi}
              </span>
            </div>
          )}
        </div>

        {/* Date et heure */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Date</label>
            <Input
              id="date-rdv"
              type="date"
              value={form.dateRdv}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => update({ dateRdv: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Heure</label>
            <Input
              id="heure-rdv"
              type="time"
              value={form.heureRdv}
              onChange={(e) => update({ heureRdv: e.target.value })}
            />
          </div>
        </div>

        {/* Motif */}
        <div className="flex flex-col gap-1">
          <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Motif *</label>
          <Input
            id="motif-rdv"
            placeholder="Ex: Contrôle tension artérielle, Suivi diabète…"
            value={form.motif}
            onChange={(e) => update({ motif: e.target.value })}
          />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Notes (facultatif)</label>
          <Input
            id="notes-rdv"
            placeholder="Instructions pour le patient…"
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </div>

        {form.submitError && (
          <p className="text-caption" style={{ color: "var(--color-error)" }}>{form.submitError}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={form.submitting || !form.patient || !form.dateRdv || !form.motif.trim()}
        >
          {form.submitting ? "Planification…" : "Planifier le rendez-vous"}
        </Button>
      </form>
    </Card>
  );
}

// ─── Carte RDV ───────────────────────────────────────────────────────────────

function RdvCard({ rdv, onAnnule }: { rdv: RendezVous; onAnnule: (id: string) => void }) {
  const [cancelling, setCancelling] = useState(false);
  const cfg = STATUT_CFG[rdv.statut];
  const passe = isRdvPasse(rdv);

  const handleAnnuler = async () => {
    if (!confirm("Confirmer l'annulation de ce rendez-vous ?")) return;
    setCancelling(true);
    try {
      await annulerRdv(rdv._id);
      onAnnule(rdv._id);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card>
      <div className="flex items-start gap-4">
        {/* Date bloc */}
        <div
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl shrink-0 text-center"
          style={{
            backgroundColor: passe ? "var(--color-surface-container)" : "var(--color-primary-container)",
            color: passe ? "var(--color-outline)" : "var(--color-on-primary-container)",
          }}
        >
          <span className="text-headline-sm leading-none font-bold">
            {new Date(rdv.date_rdv).getDate()}
          </span>
          <span className="text-caption leading-none">
            {new Date(rdv.date_rdv).toLocaleDateString("fr-FR", { month: "short" })}
          </span>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
            {rdv.motif}
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {formatRdvTime(rdv.date_rdv)} · {rdv.prenom_patient} {rdv.nom_patient}
            <span className="ml-1 opacity-60">({rdv.npi_patient})</span>
          </p>
          {rdv.notes && (
            <p className="text-caption mt-1 italic" style={{ color: "var(--color-on-surface-variant)" }}>
              {rdv.notes}
            </p>
          )}
        </div>

        {/* Statut + annulation */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            <span className="material-symbols-outlined filled text-[14px]">{cfg.icon}</span>
            <span className="text-caption font-semibold">{cfg.label}</span>
          </div>
          {!passe && rdv.statut === "confirme" && (
            <button
              onClick={handleAnnuler}
              disabled={cancelling}
              className="text-caption underline"
              style={{ color: "var(--color-error)" }}
            >
              {cancelling ? "…" : "Annuler"}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function MedecinAgenda() {
  const { user } = useAuth();
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const chargerRdvs = async () => {
    if (!user?.email) return;
    const res = await getRdvByMedecin(user.email);
    setRdvs(res);
    setLoading(false);
  };

  useEffect(() => {
    chargerRdvs();
  }, [user]);

  const handleCreated = () => {
    setShowForm(false);
    chargerRdvs();
  };

  const handleAnnule = (id: string) => {
    setRdvs((prev) => prev.map((r) => r._id === id ? { ...r, statut: "annule" } : r));
  };

  const aVenir = rdvs.filter((r) => !isRdvPasse(r) && r.statut === "confirme");
  const passes = rdvs.filter((r) => isRdvPasse(r) || r.statut !== "confirme");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Agenda & Rendez-vous
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Gérez vos rendez-vous avec vos patients.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm((v) => !v)}
        >
          <span className="material-symbols-outlined text-[18px]">
            {showForm ? "close" : "add"}
          </span>
          {showForm ? "Annuler" : "Nouveau RDV"}
        </Button>
      </div>

      {/* Formulaire */}
      {showForm && <NouveauRdvForm onCreated={handleCreated} />}

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Chargement de l'agenda…" />
        </div>
      ) : rdvs.length === 0 && !showForm ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="material-symbols-outlined text-[56px]" style={{ color: "var(--color-outline)" }}>
              calendar_month
            </span>
            <p className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
              Aucun rendez-vous planifié
            </p>
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Cliquez sur "Nouveau RDV" pour planifier le premier rendez-vous.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {aVenir.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined filled text-[20px]" style={{ color: "var(--color-primary)" }}>upcoming</span>
                <h2 className="text-subheading" style={{ color: "var(--color-on-surface)" }}>
                  À venir ({aVenir.length})
                </h2>
              </div>
              {aVenir.map((r) => <RdvCard key={r._id} rdv={r} onAnnule={handleAnnule} />)}
            </div>
          )}

          {passes.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-outline)" }}>history</span>
                <h2 className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
                  Historique ({passes.length})
                </h2>
              </div>
              {passes.map((r) => <RdvCard key={r._id} rdv={r} onAnnule={handleAnnule} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

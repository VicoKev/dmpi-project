// Agenda médecin — Planification et gestion des rendez-vous
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Spinner from "../../components/ui/Spinner";
import {
  getRdvByMedecin,
  createRdv,
  modifierRdv,
  annulerRdv,
  terminerRdv,
  isRdvPasse,
  estACloturer,
  formatRdvTime,
  versISOLocal,
  dateLocaleAujourdhui,
  type RendezVous,
} from "../../services/rdvService";
import { getPatientByNpi, validateNpi } from "../../services/patientService";
import type { PatientSearchResult } from "../../types/patient";

const STATUT_CFG = {
  confirme: { label: "Confirmé", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  annule:   { label: "Annulé",   color: "var(--color-error)",   bg: "var(--color-error-container)",   icon: "cancel" },
  complete: { label: "Effectué", color: "var(--color-outline)", bg: "var(--color-surface-container)", icon: "task_alt" },
};

const CONFIRMATION_PATIENT_CFG = {
  en_attente: { label: "En attente de réponse du patient", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "hourglass_empty" },
  confirme: { label: "Présence confirmée par le patient", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  empechement: { label: "Empêchement signalé par le patient", color: "var(--color-on-error-container)", bg: "var(--color-error-container)", icon: "report" },
};

const DUREE_OPTIONS = [15, 30, 45, 60];

function libelleDuree(minutes: number): string {
  return minutes === 60 ? "1h" : `${minutes} min`;
}

const dateAujourdhui = dateLocaleAujourdhui;

/** Combine une date (YYYY-MM-DD) et une heure (HH:MM) en Date locale, ou null si incomplet/invalide. */
function combinerDateHeure(dateStr: string, heureStr: string): Date | null {
  if (!dateStr || !heureStr) return null;
  const d = new Date(`${dateStr}T${heureStr}:00`);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Formulaire création / reprogrammation RDV ───────────────────────────────

interface FormRdv {
  npiInput: string;
  patient: PatientSearchResult | null;
  searchError: string | null;
  searching: boolean;
  dateRdv: string;
  heureRdv: string;
  duree: number;
  motif: string;
  notes: string;
  submitting: boolean;
  submitError: string | null;
}

function formVide(): FormRdv {
  return {
    npiInput: "",
    patient: null,
    searchError: null,
    searching: false,
    dateRdv: "",
    heureRdv: "08:00",
    duree: 30,
    motif: "",
    notes: "",
    submitting: false,
    submitError: null,
  };
}

function NouveauRdvForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<FormRdv>(formVide());

  const update = (patch: Partial<FormRdv>) =>
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

  const dateHeure = combinerDateHeure(form.dateRdv, form.heureRdv);
  const dateHeurePassee = dateHeure !== null && dateHeure.getTime() <= Date.now();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient || !dateHeure || !form.motif.trim() || dateHeurePassee) return;

    update({ submitting: true, submitError: null });
    try {
      await createRdv({
        npi_patient: form.patient.npi,
        nom_patient: form.patient.nom,
        prenom_patient: form.patient.prenom,
        date_rdv: versISOLocal(dateHeure),
        duree_minutes: form.duree,
        motif: form.motif.trim(),
        notes: form.notes.trim() || undefined,
      });
      setForm(formVide());
      onCreated();
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
              onChange={(e) => update({ npiInput: e.target.value.replace(/\D/g, "").slice(0, 10), patient: null, searchError: null })}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Date</label>
            <Input
              id="date-rdv"
              type="date"
              value={form.dateRdv}
              min={dateAujourdhui()}
              onChange={(e) => update({ dateRdv: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Heure</label>
            <Input
              id="heure-rdv"
              type="time"
              value={form.heureRdv}
              min={form.dateRdv === dateAujourdhui() ? new Date().toTimeString().slice(0, 5) : undefined}
              onChange={(e) => update({ heureRdv: e.target.value })}
            />
          </div>
        </div>
        {dateHeurePassee && (
          <p className="text-caption -mt-2 flex items-center gap-1" style={{ color: "var(--color-error)" }}>
            <span className="material-symbols-outlined text-[14px]">error</span>
            La date et l'heure doivent être dans le futur.
          </p>
        )}

        {/* Durée */}
        <div className="flex flex-col gap-1">
          <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Durée</label>
          <div className="flex gap-2 flex-wrap">
            {DUREE_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => update({ duree: d })}
                className="px-4 py-2 rounded-full text-body-md font-semibold border-2 transition-all"
                style={
                  form.duree === d
                    ? { borderColor: "var(--color-primary)", backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary-container)" }
                    : { borderColor: "var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }
                }
              >
                {libelleDuree(d)}
              </button>
            ))}
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
          loading={form.submitting}
          disabled={form.submitting || !form.patient || !dateHeure || !form.motif.trim() || dateHeurePassee}
        >
          Planifier le rendez-vous
        </Button>
      </form>
    </Card>
  );
}

// ─── Formulaire de reprogrammation (inline, dans la carte du RDV) ───────────

function ReprogrammerForm({ rdv, onDone, onCancel }: { rdv: RendezVous; onDone: () => void; onCancel: () => void }) {
  const initial = new Date(rdv.date_rdv);
  const [dateRdv, setDateRdv] = useState(versISOLocal(initial).slice(0, 10));
  const [heureRdv, setHeureRdv] = useState(initial.toTimeString().slice(0, 5));
  const [duree, setDuree] = useState(rdv.duree_minutes ?? 30);
  const [motif, setMotif] = useState(rdv.motif);
  const [notes, setNotes] = useState(rdv.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateHeure = combinerDateHeure(dateRdv, heureRdv);
  const dateHeurePassee = dateHeure !== null && dateHeure.getTime() <= Date.now();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateHeure || !motif.trim() || dateHeurePassee) return;
    setSubmitting(true);
    setError(null);
    try {
      await modifierRdv(rdv._id, {
        date_rdv: versISOLocal(dateHeure),
        duree_minutes: duree,
        motif: motif.trim(),
        notes: notes.trim() || undefined,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la reprogrammation.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-3 pt-3 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input type="date" label="Date" value={dateRdv} min={dateAujourdhui()} onChange={(e) => setDateRdv(e.target.value)} />
        <Input type="time" label="Heure" value={heureRdv} onChange={(e) => setHeureRdv(e.target.value)} />
      </div>
      {dateHeurePassee && (
        <p className="text-caption flex items-center gap-1" style={{ color: "var(--color-error)" }}>
          <span className="material-symbols-outlined text-[14px]">error</span>
          La date et l'heure doivent être dans le futur.
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        {DUREE_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuree(d)}
            className="px-3 py-1.5 rounded-full text-caption font-semibold border-2 transition-all"
            style={
              duree === d
                ? { borderColor: "var(--color-primary)", backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary-container)" }
                : { borderColor: "var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }
            }
          >
            {libelleDuree(d)}
          </button>
        ))}
      </div>
      <Input label="Motif" value={motif} onChange={(e) => setMotif(e.target.value)} />
      <Input label="Notes (facultatif)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <p className="text-caption" style={{ color: "var(--color-error)" }}>{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>Annuler</Button>
        <Button type="submit" size="sm" loading={submitting} disabled={!dateHeure || !motif.trim() || dateHeurePassee}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

// ─── Carte RDV ───────────────────────────────────────────────────────────────

function RdvCard({ rdv, onChanged }: { rdv: RendezVous; onChanged: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [reprogrammer, setReprogrammer] = useState(false);
  const askConfirmation = useConfirm();
  const cfg = STATUT_CFG[rdv.statut];
  const confirmationCfg = CONFIRMATION_PATIENT_CFG[rdv.confirmation_patient];
  const passe = isRdvPasse(rdv);

  const handleAnnuler = async () => {
    const ok = await askConfirmation({
      title: "Annuler le rendez-vous",
      message: "Confirmer l'annulation de ce rendez-vous ?",
      confirmLabel: "Annuler le RDV",
      variant: "danger",
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await annulerRdv(rdv._id);
      onChanged();
    } finally {
      setCancelling(false);
    }
  };

  const handleTerminer = async () => {
    setTerminating(true);
    try {
      await terminerRdv(rdv._id);
      onChanged();
    } finally {
      setTerminating(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col items-start sm:flex-row gap-3 sm:gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0 w-full sm:w-auto">
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
              {formatRdvTime(rdv.date_rdv)} ({rdv.duree_minutes ?? 30} min) · {rdv.prenom_patient} {rdv.nom_patient}
              <span className="ml-1 opacity-60">({rdv.npi_patient})</span>
            </p>
            {rdv.notes && (
              <p className="text-caption mt-1 italic" style={{ color: "var(--color-on-surface-variant)" }}>
                {rdv.notes}
              </p>
            )}
            {rdv.statut === "confirme" && !passe && (
              <div className="mt-1.5">
                <div
                  className="flex items-center gap-1.5 w-fit px-2 py-1 rounded-full"
                  style={{ backgroundColor: confirmationCfg.bg, color: confirmationCfg.color }}
                >
                  <span className="material-symbols-outlined text-[12px]">{confirmationCfg.icon}</span>
                  <span className="text-caption font-semibold">{confirmationCfg.label}</span>
                </div>
                {/* Le patient peut préciser s'il faut attendre sa disponibilité
                    ou reprogrammer directement, plutôt que de le deviner. */}
                {rdv.confirmation_patient === "empechement" && rdv.message_empechement && (
                  <p className="text-caption mt-1 italic" style={{ color: "var(--color-on-surface-variant)" }}>
                    « {rdv.message_empechement} »
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Statut + actions */}
        <div className="flex flex-row flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
          {rdv.statut !== "confirme" && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
            >
              <span className="material-symbols-outlined filled text-[14px]">{cfg.icon}</span>
              <span className="text-caption font-semibold">{cfg.label}</span>
            </div>
          )}
          {rdv.statut === "confirme" && !passe && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={reprogrammer ? "close" : "edit_calendar"}
                onClick={() => setReprogrammer((v) => !v)}
              >
                {reprogrammer ? "Fermer" : "Reprogrammer"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon="cancel"
                loading={cancelling}
                onClick={handleAnnuler}
              >
                Annuler
              </Button>
            </div>
          )}
          {estACloturer(rdv) && (
            <Button variant="outline" size="sm" icon="task_alt" loading={terminating} onClick={handleTerminer}>
              Marquer effectué
            </Button>
          )}
        </div>
      </div>

      {reprogrammer && (
        <ReprogrammerForm
          rdv={rdv}
          onDone={() => { setReprogrammer(false); onChanged(); }}
          onCancel={() => setReprogrammer(false)}
        />
      )}
    </Card>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function MedecinAgenda() {
  const { user } = useAuth();
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const chargerRdvs = async () => {
    if (!user?.email) return;
    const res = await getRdvByMedecin(user.email);
    setRdvs(res);
    setLoading(false);
  };

  useEffect(() => {
    chargerRdvs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreated = () => {
    setShowForm(false);
    chargerRdvs();
    showToast("Rendez-vous planifié avec succès.");
  };

  const handleChanged = () => {
    chargerRdvs();
  };

  const aVenir = rdvs.filter((r) => !isRdvPasse(r) && r.statut === "confirme");
  const passes = rdvs.filter((r) => isRdvPasse(r) || r.statut !== "confirme");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl animate-slide-down text-body-md font-semibold"
          style={{
            backgroundColor: toast.type === "success" ? "var(--color-success)" : "var(--color-error)",
            color: toast.type === "success" ? "var(--color-on-success)" : "var(--color-on-error)",
          }}
        >
          <span className="material-symbols-outlined filled text-[20px]">{toast.type === "success" ? "check_circle" : "error"}</span>
          {toast.message}
        </div>
      )}

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
          icon={showForm ? "close" : "add"}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Fermer" : "Nouveau RDV"}
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
              {aVenir.map((r) => <RdvCard key={r._id} rdv={r} onChanged={handleChanged} />)}
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
              {passes.map((r) => <RdvCard key={r._id} rdv={r} onChanged={handleChanged} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// File d'attente de pré-consultation — Espace Infirmier
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { validateNpi, getDossierPatient } from "../../services/patientService";
import {
  ajouterFileAttente,
  getFileAttenteEtablissement,
  getMedecinsDisponibles,
  assignerMedecin,
  type EntreeFileAttente,
  type MedecinDisponible,
} from "../../services/fileAttenteService";

const REFRESH_MS = 30_000;

const PRIORITE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normale: { label: "Normale", color: "var(--color-on-surface-variant)", bg: "var(--color-surface-container)" },
  urgente: { label: "Urgente", color: "var(--color-on-error-container)", bg: "var(--color-error-container)" },
};

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  en_attente: { label: "À assigner", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "hourglass_empty" },
  assigne: { label: "Assigné", color: "var(--color-on-primary-container)", bg: "var(--color-primary-container)", icon: "assignment_ind" },
  en_consultation: { label: "En consultation", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "medical_services" },
};

function NouvellePreConsultationForm({ medecins, onAdded }: { medecins: MedecinDisponible[]; onAdded: () => void }) {
  const [npi, setNpi] = useState("");
  const [patientTrouve, setPatientTrouve] = useState<{ nom: string; prenom: string } | null>(null);
  const [checkingNpi, setCheckingNpi] = useState(false);
  const [motif, setMotif] = useState("");
  const [priorite, setPriorite] = useState<"normale" | "urgente">("normale");
  const [medecinEmail, setMedecinEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cleanNpi = npi.replace(/\D/g, "");
    if (cleanNpi.length !== 10) {
      setPatientTrouve(null);
      return;
    }
    let cancelled = false;
    setCheckingNpi(true);
    getDossierPatient(cleanNpi)
      .then((d) => {
        if (cancelled) return;
        setPatientTrouve(d ? { nom: d.patient.nom, prenom: d.patient.prenom } : null);
      })
      .finally(() => {
        if (!cancelled) setCheckingNpi(false);
      });
    return () => {
      cancelled = true;
    };
  }, [npi]);

  const handleNpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNpi(e.target.value.replace(/\D/g, "").slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateNpi(npi)) {
      setError("Le NPI doit comporter exactement 10 chiffres.");
      return;
    }
    if (!patientTrouve) {
      setError("Aucun dossier ne correspond à ce NPI. Créez-le d'abord.");
      return;
    }
    if (!motif.trim()) {
      setError("Le motif de la visite est requis.");
      return;
    }

    setLoading(true);
    try {
      await ajouterFileAttente({
        npi,
        motif_bref: motif.trim(),
        priorite,
        medecin_email: medecinEmail || null,
      });
      setNpi("");
      setPatientTrouve(null);
      setMotif("");
      setPriorite("normale");
      setMedecinEmail("");
      onAdded();
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'ajout à la file d'attente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-body-md"
          style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}
        >
          <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
          <span>{error}</span>
        </div>
      )}

      <Input
        label="NPI du patient"
        value={npi}
        onChange={handleNpiChange}
        leadingIcon="badge"
        placeholder="Ex: 1001002001"
        hint={checkingNpi ? "Recherche…" : patientTrouve ? `${patientTrouve.prenom} ${patientTrouve.nom}` : undefined}
        maxLength={10}
        required
      />

      <div className="flex flex-col gap-1">
        <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>
          Motif de la visite
        </label>
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          placeholder="Ex : fièvre depuis 3 jours, toux..."
          className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
          style={{
            borderColor: "var(--color-outline-variant)",
            backgroundColor: "var(--color-surface-container-lowest)",
            color: "var(--color-on-surface)",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Priorité</label>
          <select
            value={priorite}
            onChange={(e) => setPriorite(e.target.value as "normale" | "urgente")}
            className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-on-surface)" }}
          >
            <option value="normale">Normale</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Médecin (optionnel)</label>
          <select
            value={medecinEmail}
            onChange={(e) => setMedecinEmail(e.target.value)}
            className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-on-surface)" }}
          >
            <option value="">Assigner plus tard</option>
            {medecins.map((m) => (
              <option key={m.email} value={m.email} disabled={!m.disponible}>
                Dr. {m.prenom} {m.nom}{m.specialite ? ` — ${m.specialite}` : ""}{!m.disponible ? " (indisponible)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" icon="person_add" loading={loading}>
        Ajouter à la file d'attente
      </Button>
    </form>
  );
}

export default function InfirmierFileAttente() {
  const [entrees, setEntrees] = useState<EntreeFileAttente[]>([]);
  const [medecins, setMedecins] = useState<MedecinDisponible[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, m] = await Promise.all([getFileAttenteEtablissement(), getMedecinsDisponibles()]);
      setEntrees(e);
      setMedecins(m);
      setError(null);
    } catch (err) {
      setError((err as Error).message || "Impossible de charger la file d'attente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleAssigner = async (entree: EntreeFileAttente, medecinEmail: string) => {
    if (!medecinEmail) return;
    setAssigningId(entree.id);
    try {
      await assignerMedecin(entree.id, medecinEmail);
      await load();
    } catch (err) {
      alert((err as Error).message || "Erreur lors de l'assignation.");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          File d'attente de pré-consultation
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Enregistrez un patient arrivant et assignez-le à un médecin disponible de votre établissement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader icon="person_add" title="Nouvelle pré-consultation" />
          <NouvellePreConsultationForm medecins={medecins} onAdded={load} />
        </Card>

        <Card>
          <CardHeader icon="groups" title={`File actuelle (${entrees.length})`} />
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
          ) : entrees.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
              <span className="material-symbols-outlined text-5xl opacity-40">event_available</span>
              <p className="text-body-md">Aucun patient en attente actuellement.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {entrees.map((e) => {
                const statutCfg = STATUT_CONFIG[e.statut] ?? STATUT_CONFIG.en_attente;
                const prioriteCfg = PRIORITE_CONFIG[e.priorite] ?? PRIORITE_CONFIG.normale;
                const medecin = medecins.find((m) => m.email === e.medecin_email);
                return (
                  <li key={e.id} className="flex flex-col gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                          {e.prenom} {e.nom}
                          <span className="text-caption font-normal ml-2" style={{ color: "var(--color-on-surface-variant)" }}>
                            NPI {e.npi}
                          </span>
                        </p>
                        <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>{e.motif_bref}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-caption font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: prioriteCfg.bg, color: prioriteCfg.color }}>
                          {prioriteCfg.label}
                        </span>
                        <span className="text-caption font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: statutCfg.bg, color: statutCfg.color }}>
                          <span className="material-symbols-outlined text-[13px]">{statutCfg.icon}</span>
                          {statutCfg.label}
                        </span>
                      </div>
                    </div>
                    {e.statut === "en_attente" ? (
                      <select
                        value=""
                        onChange={(ev) => handleAssigner(e, ev.target.value)}
                        disabled={assigningId === e.id}
                        className="w-full py-2 px-3 rounded-lg border text-body-md focus:outline-none focus:ring-2"
                        style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-on-surface)" }}
                      >
                        <option value="">{assigningId === e.id ? "Assignation…" : "Assigner à un médecin"}</option>
                        {medecins.map((m) => (
                          <option key={m.email} value={m.email} disabled={!m.disponible}>
                            Dr. {m.prenom} {m.nom}{!m.disponible ? " (indisponible)" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        Dr. {medecin ? `${medecin.prenom} ${medecin.nom}` : e.medecin_email}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-caption text-center" style={{ color: "var(--color-on-surface-variant)" }}>
        La liste se rafraîchit automatiquement toutes les 30 secondes.
      </p>
    </div>
  );
}

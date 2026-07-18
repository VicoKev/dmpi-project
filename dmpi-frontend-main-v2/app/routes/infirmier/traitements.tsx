// Page Traitements — Espace Infirmier
// Administration et traçabilité des médicaments prescrits
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import Spinner from "../../components/ui/Spinner";
import {
  createAdministration,
  getTodayAdministrationsByPatient,
  VOIE_LABELS,
  STATUT_ADMIN_LABELS,
  type CreateAdministrationPayload,
  type AdministrationMedicament,
} from "../../services/administrationService";
import {
  getPatientByNpi,
  validateNpi,
  calculerAge,
  getDossierPatient,
} from "../../services/patientService";
import type { PatientSearchResult } from "../../types/patient";

const VOIE_OPTIONS = Object.entries(VOIE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATUT_OPTIONS = Object.entries(STATUT_ADMIN_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function normaliserNomMedicament(nom: string): string {
  return nom.trim().toLowerCase();
}

const STATUT_AUJOURDHUI_CFG: Record<AdministrationMedicament["statut"], { label: string; color: string; bg: string; icon: string }> = {
  administre: { label: "Déjà administré", color: "var(--color-on-success-container)", bg: "var(--color-success-container)", icon: "check_circle" },
  refuse: { label: "Refusé", color: "var(--color-on-error-container)", bg: "var(--color-error-container)", icon: "block" },
  reporte: { label: "Reporté", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", icon: "schedule" },
};

function formatHeure(dateIso: string): string {
  return new Date(dateIso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function InfirmierTraitements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const npiPrefill = searchParams.get("npi");

  // Étape 1 : Recherche patient
  const [npiInput, setNpiInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientSearchResult | null>(null);
  const [traitements, setTraitements] = useState<{ id: string; medicament: string; dosage: string; frequence: string }[]>([]);
  const [adminsAujourdhui, setAdminsAujourdhui] = useState<AdministrationMedicament[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Étape 2 : Formulaire administration
  const [medicament, setMedicament] = useState("");
  const [dosage, setDosage] = useState("");
  const [voie, setVoie] = useState<AdministrationMedicament["voieAdministration"]>("orale");
  const [statut, setStatut] = useState<AdministrationMedicament["statut"]>("administre");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const rechercherPatient = async (npi: string) => {
    if (!validateNpi(npi)) {
      setSearchError("Le NPI doit contenir exactement 10 chiffres.");
      return;
    }
    setSearchError(null);
    setSearching(true);
    setPatient(null);
    setSuccess(false);

    const [result, dossier, adminsJour] = await Promise.all([
      getPatientByNpi(npi),
      getDossierPatient(npi),
      getTodayAdministrationsByPatient(npi).catch(() => []),
    ]);

    setSearching(false);
    if (!result) {
      setSearchError(`Aucun patient trouvé pour le NPI ${npi}.`);
    } else {
      setPatient(result);
      // Un traitement arrêté ne doit plus être proposé en préremplissage.
      setTraitements((dossier?.traitementsEnCours ?? []).filter((t) => t.actif));
      setAdminsAujourdhui(adminsJour);
    }
  };

  /** Dernière administration du jour pour ce médicament, s'il y en a une —
   * pour repérer un risque de double dose avant d'en enregistrer une nouvelle. */
  const dernierAdminAujourdhui = (medicament: string): AdministrationMedicament | undefined => {
    const cible = normaliserNomMedicament(medicament);
    return adminsAujourdhui.find((a) => normaliserNomMedicament(a.medicament) === cible);
  };

  // Arrivée depuis le dossier du patient (bouton "Administrer un
  // traitement") — le NPI est déjà connu, inutile de le faire ressaisir.
  useEffect(() => {
    if (npiPrefill && validateNpi(npiPrefill)) {
      rechercherPatient(npiPrefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npiPrefill]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await rechercherPatient(npiInput.trim());
  };

  const prefillTraitement = (t: { medicament: string; dosage: string }) => {
    setMedicament(t.medicament);
    setDosage(t.dosage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicament.trim() || !dosage.trim()) {
      setFormError("Le médicament et le dosage sont obligatoires.");
      return;
    }
    if (!patient || !user) return;

    setFormError(null);
    setIsSubmitting(true);

    const payload: CreateAdministrationPayload = {
      patientNpi: patient.npi,
      medicament: medicament.trim(),
      dosage: dosage.trim(),
      voieAdministration: voie,
      statut,
      notes: notes.trim() || undefined,
    };

    try {
      const creee = await createAdministration(
        payload,
        user.id,
        `Inf. ${user.prenom} ${user.nom}`,
        user.etablissement ?? "Établissement inconnu"
      );
      // Mise à jour optimiste : l'indicateur "déjà administré aujourd'hui"
      // doit refléter cette administration sans attendre un rechargement.
      setAdminsAujourdhui((prev) => [creee, ...prev]);
      setSuccess(true);
    } catch (err: any) {
      console.error("Erreur création administration:", err);
      setFormError(err.message || "Une erreur est survenue lors de l'enregistrement de l'administration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Administration des traitements
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Identifiez le patient, sélectionnez ou saisissez le médicament, puis enregistrez l'administration.
        </p>
      </div>

      {/* Recherche patient */}
      {!patient && !success && (
        <Card>
          <CardHeader icon="badge" title="Identification du patient" />
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <Input
              label="NPI Patient (10 chiffres)"
              placeholder="Ex: 7123456789"
              value={npiInput}
              onChange={(e) => {
                setNpiInput(e.target.value.replace(/\D/g, "").slice(0, 10));
                setSearchError(null);
              }}
              leadingIcon="badge"
              error={searchError ?? undefined}
              maxLength={10}
            />
            <Button type="submit" icon="search" loading={searching} className="self-start">
              Identifier le patient
            </Button>
          </form>
          {searching && (
            <div className="flex justify-center py-4">
              <Spinner label="Recherche en cours…" />
            </div>
          )}
        </Card>
      )}

      {/* Patient trouvé */}
      {patient && !success && (
        <>
          {/* Résumé patient */}
          <Card>
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-headline-sm font-bold shrink-0"
                style={{
                  backgroundColor: "var(--color-primary-container)",
                  color: "var(--color-on-primary-container)",
                }}
              >
                {patient.prenom[0]}{patient.nom[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-subheading font-bold" style={{ color: "var(--color-on-surface)" }}>
                  {patient.prenom} {patient.nom}
                </p>
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                  NPI {patient.npi} · {patient.sexe === "M" ? "Homme" : "Femme"} · {calculerAge(patient.dateNaissance)} ans
                </p>
                {patient.allergiesCount > 0 && (
                  <p className="text-caption font-semibold mt-1" style={{ color: "var(--color-error)" }}>
                    ⚠ {patient.allergiesCount} allergie(s) connue(s) — vérifier avant administration
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon="close"
                onClick={() => { setPatient(null); setNpiInput(""); setSuccess(false); }}
              >
                Changer
              </Button>
            </div>
          </Card>

          {/* Traitements en cours (clic pour préremplir) */}
          {traitements.length > 0 && (
            <Card>
              <CardHeader icon="medication" title="Traitements en cours — Cliquer pour sélectionner" />
              <div className="flex flex-wrap gap-2 items-start">
                {traitements.map((t) => {
                  const dernier = dernierAdminAujourdhui(t.medicament);
                  const cfgAujourdhui = dernier ? STATUT_AUJOURDHUI_CFG[dernier.statut] : null;
                  return (
                    <div key={t.id} className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => prefillTraitement(t)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-body-md transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: "var(--color-primary-container)",
                          color: "var(--color-on-primary-container)",
                        }}
                      >
                        <span className="material-symbols-outlined filled text-[16px]">medication</span>
                        <span className="font-semibold">{t.medicament}</span>
                        <span className="text-caption opacity-75">{t.dosage}</span>
                      </button>
                      {cfgAujourdhui && dernier && (
                        <span
                          className="text-caption font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full w-fit"
                          style={{ backgroundColor: cfgAujourdhui.bg, color: cfgAujourdhui.color }}
                        >
                          <span className="material-symbols-outlined text-[12px]">{cfgAujourdhui.icon}</span>
                          {cfgAujourdhui.label} à {formatHeure(dernier.date)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Formulaire d'administration */}
          <Card>
            <CardHeader icon="edit_note" title="Enregistrer une administration" />
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Médicament"
                  required
                  placeholder="Ex: Metformine"
                  value={medicament}
                  onChange={(e) => setMedicament(e.target.value)}
                  leadingIcon="medication"
                />
                <Input
                  label="Dosage administré"
                  required
                  placeholder="Ex: 850 mg"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Voie d'administration"
                  value={voie}
                  onChange={(e) => setVoie(e.target.value as AdministrationMedicament["voieAdministration"])}
                  options={VOIE_OPTIONS}
                />
                <Select
                  label="Statut"
                  value={statut}
                  onChange={(e) => setStatut(e.target.value as AdministrationMedicament["statut"])}
                  options={STATUT_OPTIONS}
                />
              </div>

              <Textarea
                label="Notes (optionnel)"
                placeholder="Réaction du patient, contexte particulier…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />

              {formError && (
                <p className="text-body-md" style={{ color: "var(--color-error)" }}>{formError}</p>
              )}

              <div className="flex flex-wrap gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => { setPatient(null); setNpiInput(""); }}>
                  Annuler
                </Button>
                <Button type="submit" icon="check_circle" loading={isSubmitting}>
                  Enregistrer l'administration
                </Button>
              </div>
            </form>
          </Card>
        </>
      )}

      {/* Succès */}
      {success && patient && (
        <Card className="animate-fade-in-up">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--color-success-container)" }}
            >
              <span className="material-symbols-outlined filled text-[36px]" style={{ color: "var(--color-on-success-container)" }}>
                check_circle
              </span>
            </div>
            <div>
              <h2 className="text-headline-sm" style={{ color: "var(--color-on-surface)" }}>
                Administration enregistrée
              </h2>
              <p className="text-body-md mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                L'administration de <strong>{medicament}</strong> pour{" "}
                <strong>{patient.prenom} {patient.nom}</strong> a été tracée avec succès.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="outline"
                icon="add"
                onClick={() => {
                  setSuccess(false);
                  setMedicament("");
                  setDosage("");
                  setNotes("");
                }}
              >
                Nouvelle administration
              </Button>
              <Button
                icon="folder_open"
                onClick={() => navigate(`/infirmier/dossier/${patient.npi}`)}
              >
                Voir le dossier
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

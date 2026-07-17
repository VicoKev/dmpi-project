// Page Constantes vitales — Espace Infirmier
// Recherche un patient par NPI, puis affiche le formulaire d'enregistrement des constantes
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Spinner from "../../components/ui/Spinner";
import ConstantesForm from "../../components/forms/ConstantesForm";
import { getPatientByNpi, validateNpi, calculerAge, formatDateFr } from "../../services/patientService";
import { createReleve } from "../../services/constanstesService";
import type { PatientSearchResult } from "../../types/patient";
import type { Constantes } from "../../types/consultation";

export default function InfirmierConstantes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const npiPrefill = searchParams.get("npi");
  const [npiInput, setNpiInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const result = await getPatientByNpi(npi);
    setSearching(false);
    if (!result) {
      setSearchError(`Aucun patient trouvé pour le NPI ${npi}.`);
    } else {
      setPatient(result);
    }
  };

  // Arrivée depuis le dossier du patient (bouton "Relevé de constantes") —
  // le NPI est déjà connu, inutile de le faire ressaisir.
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

  const handleSubmit = async (constantes: Constantes, notes: string) => {
    if (!patient || !user) return;
    setIsSubmitting(true);
    try {
      await createReleve(
        { patientNpi: patient.npi, constantes, notes: notes || undefined },
        user.id,
        `Inf. ${user.prenom} ${user.nom}`,
        user.etablissement ?? "Établissement inconnu"
      );
      setSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Relevé de constantes vitales
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Identifiez le patient par son NPI, puis saisissez ses constantes vitales.
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

      {/* Patient trouvé — fiche rapide + formulaire */}
      {patient && !success && (
        <>
          {/* Fiche résumé patient */}
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
                  {patient.groupeSanguin && ` · Groupe ${patient.groupeSanguin}`}
                </p>
                {patient.allergiesCount > 0 && (
                  <p
                    className="text-caption font-semibold mt-1"
                    style={{ color: "var(--color-error)" }}
                  >
                    ⚠ {patient.allergiesCount} allergie(s) connue(s)
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon="close"
                onClick={() => {
                  setPatient(null);
                  setNpiInput("");
                }}
              >
                Changer
              </Button>
            </div>
          </Card>

          <ConstantesForm
            patientNpi={patient.npi}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
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
              <span
                className="material-symbols-outlined filled text-[36px]"
                style={{ color: "var(--color-success)" }}
              >
                check_circle
              </span>
            </div>
            <div>
              <h2 className="text-headline-sm" style={{ color: "var(--color-on-surface)" }}>
                Constantes enregistrées
              </h2>
              <p className="text-body-md mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                Les constantes de <strong>{patient.prenom} {patient.nom}</strong> ont été
                enregistrées avec succès.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                variant="outline"
                icon="add"
                onClick={() => {
                  setSuccess(false);
                  setPatient(null);
                  setNpiInput("");
                }}
              >
                Nouveau relevé
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

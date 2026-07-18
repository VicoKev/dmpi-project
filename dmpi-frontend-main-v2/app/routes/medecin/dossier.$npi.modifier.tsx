import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Spinner from "../../components/ui/Spinner";
import Select from "../../components/ui/Select";
import {
  getDossierPatient,
  updateDossierPatient,
} from "../../services/patientService";

export default function EditDossierPatient() {
  const { npi } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateNaissance, setDateNaissance] = useState("");
  const [sexe, setSexe] = useState("M");
  const [groupeSanguin, setGroupeSanguin] = useState("");
  
  const [allergies, setAllergies] = useState<{ substance: string; severite: string; notes: string }[]>([]);
  const [antecedents, setAntecedents] = useState<string[]>([]);

  useEffect(() => {
    if (!npi) return;
    getDossierPatient(npi)
      .then((dossier) => {
        if (dossier) {
          setDateNaissance(dossier.patient.dateNaissance || "");
          setSexe(dossier.patient.sexe || "M");
          setGroupeSanguin(dossier.patient.groupeSanguin || "");
          setAllergies(
            dossier.allergies.map((a) => ({
              substance: a.substance,
              severite: a.severite,
              notes: a.reaction || "",
            }))
          );
          setAntecedents(dossier.antecedents.map((a) => a.description));
        } else {
          setError("Dossier introuvable.");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      })
      .finally(() => setLoading(false));
  }, [npi]);

  const handleAddAllergie = () => {
    setAllergies([...allergies, { substance: "", severite: "legere", notes: "" }]);
  };

  const handleRemoveAllergie = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleUpdateAllergie = (index: number, field: string, value: string) => {
    const newAllergies = [...allergies];
    newAllergies[index] = { ...newAllergies[index], [field]: value } as any;
    setAllergies(newAllergies);
  };

  const handleAddAntecedent = () => {
    setAntecedents([...antecedents, ""]);
  };

  const handleRemoveAntecedent = (index: number) => {
    setAntecedents(antecedents.filter((_, i) => i !== index));
  };

  const handleUpdateAntecedent = (index: number, value: string) => {
    const newAntecedents = [...antecedents];
    newAntecedents[index] = value;
    setAntecedents(newAntecedents);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!npi) return;
    setSubmitting(true);
    setError(null);

    try {
      await updateDossierPatient(npi, {
        npi,
        date_naissance: dateNaissance || null,
        sexe: sexe || null,
        groupe_sanguin: groupeSanguin || null,
        allergies: allergies.filter(a => a.substance.trim() !== "").map(a => ({
          substance: a.substance,
          severite: a.severite,
          notes: a.notes || undefined
        })),
        antecedents: antecedents.filter(a => a.trim() !== ""),
      });
      navigate(`/medecin/dossier/${npi}`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (error) return <div className="p-4" style={{ color: "var(--color-error)" }}>{error}</div>;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-4xl mx-auto mb-10">
      <div className="flex items-center gap-4 flex-wrap">
        <Button icon="arrow_back" variant="ghost" onClick={() => navigate(`/medecin/dossier/${npi}`)}>
          Retour au dossier
        </Button>
        <h1 className="text-headline-md text-[var(--color-primary)]">Modifier le dossier médical</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader icon="person" title="Données Démographiques (Médicales)" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Input
              label="Date de naissance"
              type="date"
              value={dateNaissance}
              onChange={(e) => setDateNaissance(e.target.value)}
            />
            <Select
              label="Sexe"
              value={sexe}
              onChange={(e) => setSexe(e.target.value)}
              options={[
                { value: "M", label: "Masculin" },
                { value: "F", label: "Féminin" },
                { value: "Autre", label: "Autre" },
              ]}
            />
            <Select
              label="Groupe Sanguin"
              value={groupeSanguin}
              onChange={(e) => setGroupeSanguin(e.target.value)}
              options={[
                { value: "", label: "Non renseigné" },
                { value: "A+", label: "A+" },
                { value: "A-", label: "A-" },
                { value: "B+", label: "B+" },
                { value: "B-", label: "B-" },
                { value: "AB+", label: "AB+" },
                { value: "AB-", label: "AB-" },
                { value: "O+", label: "O+" },
                { value: "O-", label: "O-" },
              ]}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardHeader icon="warning" title="Allergies" />
            <Button type="button" icon="add" variant="outline" size="sm" onClick={handleAddAllergie}>
              Ajouter une allergie
            </Button>
          </div>
          {allergies.length === 0 ? (
            <p className="text-body-md text-[var(--color-on-surface-variant)] mt-2">Aucune allergie.</p>
          ) : (
            <div className="flex flex-col gap-4 mt-4">
              {allergies.map((alg, index) => (
                <div key={index} className="flex flex-col md:flex-row items-start gap-4 p-4 border rounded-xl border-[var(--color-outline-variant)]">
                  <div className="flex-1">
                    <Input
                      label="Substance *"
                      value={alg.substance}
                      onChange={(e) => handleUpdateAllergie(index, "substance", e.target.value)}
                      placeholder="Ex: Pénicilline, Arachides..."
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      label="Sévérité"
                      value={alg.severite}
                      onChange={(e) => handleUpdateAllergie(index, "severite", e.target.value)}
                      options={[
                        { value: "legere", label: "Légère" },
                        { value: "moderee", label: "Modérée" },
                        { value: "severe", label: "Sévère" },
                        { value: "anaphylaxie", label: "Anaphylaxie" },
                      ]}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      label="Notes / Réaction"
                      value={alg.notes}
                      onChange={(e) => handleUpdateAllergie(index, "notes", e.target.value)}
                      placeholder="Ex: Éruptions cutanées"
                    />
                  </div>
                  <button type="button" onClick={() => handleRemoveAllergie(index)} className="self-end md:self-auto md:mt-8 text-[var(--color-error)]">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardHeader icon="history" title="Antécédents (Médicaux, Chirurgicaux, etc.)" />
            <Button type="button" icon="add" variant="outline" size="sm" onClick={handleAddAntecedent}>
              Ajouter un antécédent
            </Button>
          </div>
          {antecedents.length === 0 ? (
            <p className="text-body-md text-[var(--color-on-surface-variant)] mt-2">Aucun antécédent.</p>
          ) : (
            <div className="flex flex-col gap-3 mt-4">
              {antecedents.map((ant, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      label={`Antécédent ${index + 1}`}
                      value={ant}
                      onChange={(e) => handleUpdateAntecedent(index, e.target.value)}
                      placeholder="Ex: Diabète de type 2 (depuis 2018), Appendicectomie (2010)"
                      required
                    />
                  </div>
                  <button type="button" onClick={() => handleRemoveAntecedent(index)} className="text-[var(--color-error)]">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-4 mt-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/medecin/dossier/${npi}`)}>
            Annuler
          </Button>
          <Button type="submit" icon="save" loading={submitting}>
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </div>
  );
}

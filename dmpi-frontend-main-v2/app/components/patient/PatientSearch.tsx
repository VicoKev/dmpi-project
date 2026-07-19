// Composant de recherche patient — par NPI (strict) ou par nom (quand le NPI est inconnu)
import { useState } from "react";
import { useNavigate } from "react-router";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { getPatientByNpi, validateNpi, rechercherPatientsParNom, calculerAge, type RechercheDossierResultat } from "../../services/patientService";

interface PatientSearchProps {
  /** Base de la route de redirection. Défaut : /medecin/dossier */
  redirectBase?: string;
}

export default function PatientSearch({ redirectBase = "/medecin/dossier" }: PatientSearchProps) {
  const [mode, setMode] = useState<"npi" | "nom">("npi");
  const [npi, setNpi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [resultats, setResultats] = useState<RechercheDossierResultat[] | null>(null);

  const handleSearchParNom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultats(null);

    if (!nom.trim() && !prenom.trim() && !dateNaissance) {
      setError("Indiquez au moins un nom, un prénom ou une date de naissance.");
      return;
    }

    setIsLoading(true);
    try {
      const r = await rechercherPatientsParNom({ nom, prenom, dateNaissance });
      setResultats(r);
      if (r.length === 0) setError("Aucun patient ne correspond à ces critères.");
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la recherche.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNpi = npi.replace(/\D/g, "");

    if (!cleanNpi) {
      setError("Veuillez saisir un NPI.");
      return;
    }

    if (!validateNpi(cleanNpi)) {
      setError("Le NPI doit comporter exactement 10 chiffres.");
      return;
    }

    setIsLoading(true);
    try {
      const patient = await getPatientByNpi(cleanNpi);
      if (patient) {
        navigate(`${redirectBase}/${cleanNpi}`);
      } else {
        setError("Aucun patient trouvé avec ce NPI.");
      }
    } catch (err) {
      setError("Erreur lors de la recherche.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNpiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // N'accepte que les chiffres
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) {
      setNpi(val);
      if (error) setError(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-lg w-full">
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: "var(--color-surface-container)" }}>
        {([
          { key: "npi" as const, label: "Par NPI" },
          { key: "nom" as const, label: "Par nom" },
        ]).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => { setMode(opt.key); setError(null); setResultats(null); }}
            className="px-4 py-2 rounded-lg text-body-md font-semibold transition-all"
            style={
              mode === opt.key
                ? { backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-primary)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : { color: "var(--color-on-surface-variant)" }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "npi" ? (
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <Input
            label="NPI Patient (Numéro Personnel d'Identification)"
            type="text"
            placeholder="Ex: 7123456789"
            value={npi}
            onChange={handleNpiChange}
            leadingIcon="badge"
            trailingIcon={npi.length === 10 ? "check_circle" : undefined}
            error={error ?? undefined}
            hint="10 chiffres strictement"
            maxLength={10}
            style={npi.length === 10 && !error ? { borderColor: "var(--color-success)" } : undefined}
          />
          <Button
            type="submit"
            icon="search"
            disabled={npi.length !== 10}
            loading={isLoading}
          >
            Rechercher le dossier
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSearchParNom} className="flex flex-col gap-4">
          <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
            Pour un patient dont le NPI est inconnu (urgence, absence de carte…). Sert uniquement à retrouver le
            bon NPI — le dossier reste identifié par NPI une fois ouvert.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Dossou" />
            <Input label="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ex: Koffi" />
          </div>
          <Input label="Date de naissance (optionnel)" type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} />
          {error && (
            <p className="text-caption" style={{ color: "var(--color-error)" }}>{error}</p>
          )}
          <Button type="submit" icon="search" loading={isLoading}>
            Rechercher
          </Button>

          {resultats && resultats.length > 0 && (
            <ul className="flex flex-col gap-2">
              {resultats.map((r) => (
                <li key={r.npi}>
                  <button
                    type="button"
                    onClick={() => navigate(`${redirectBase}/${r.npi}`)}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-colors hover:bg-[var(--color-surface-container-low)]"
                    style={{ backgroundColor: "var(--color-surface-container-low)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        {r.prenom} {r.nom}
                      </p>
                      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        NPI {r.npi}
                        {r.date_naissance ? ` · ${calculerAge(r.date_naissance)} ans` : ""}
                        {r.sexe ? ` · ${r.sexe}` : ""}
                      </p>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: "var(--color-on-surface-variant)" }}>chevron_right</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}
    </div>
  );
}

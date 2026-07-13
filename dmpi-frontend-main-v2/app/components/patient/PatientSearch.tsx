// Composant de recherche NPI — Validation stricte
import { useState } from "react";
import { useNavigate } from "react-router";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { getPatientByNpi, validateNpi } from "../../services/patientService";

interface PatientSearchProps {
  /** Base de la route de redirection. Défaut : /medecin/dossier */
  redirectBase?: string;
}

export default function PatientSearch({ redirectBase = "/medecin/dossier" }: PatientSearchProps) {
  const [npi, setNpi] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
    <form onSubmit={handleSearch} className="flex flex-col gap-4 max-w-lg w-full">
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
  );
}

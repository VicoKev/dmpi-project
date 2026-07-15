// Formulaire de création de dossier médical — partagé Médecin / Infirmier
// Ne crée qu'un dossier (NPI), jamais de compte de connexion : cf. /admin/users, réservé au Super Admin.
import { useState } from "react";
import { useNavigate } from "react-router";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { createDossierPatient } from "../../services/patientService";
import { createDemandeAcces } from "../../services/demandeAccesService";
import { validateNpi } from "../../services/patientService";

interface NouveauPatientFormProps {
  /** Base de la route de redirection après création. Défaut : /medecin/dossier */
  redirectBase?: string;
}

const GROUPES_SANGUINS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const LIENS_PARENTE = ["Mère", "Père", "Tuteur légal", "Frère/Sœur", "Grand-parent", "Conjoint(e)", "Autre"];

export default function NouveauPatientForm({ redirectBase = "/medecin/dossier" }: NouveauPatientFormProps) {
  const navigate = useNavigate();

  const [npi, setNpi] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [sexe, setSexe] = useState("M");
  const [groupeSanguin, setGroupeSanguin] = useState("");
  const [demandeAccesSouhaitee, setDemandeAccesSouhaitee] = useState(false);
  const [tuteurNom, setTuteurNom] = useState("");
  const [telephoneContact, setTelephoneContact] = useState("");
  const [lienParente, setLienParente] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!nom.trim() || !prenom.trim()) {
      setError("Le nom et le prénom sont obligatoires.");
      return;
    }
    if (demandeAccesSouhaitee && !telephoneContact.trim()) {
      setError("Un numéro de téléphone de contact est requis pour demander un accès portail.");
      return;
    }

    setLoading(true);
    try {
      await createDossierPatient({
        npi,
        nom: nom.trim(),
        prenom: prenom.trim(),
        date_naissance: dateNaissance || null,
        sexe,
        groupe_sanguin: groupeSanguin || null,
        tuteur: tuteurNom.trim()
          ? { nom: tuteurNom.trim(), telephone: telephoneContact.trim(), lien_parente: lienParente || "Autre" }
          : null,
      });

      if (demandeAccesSouhaitee) {
        await createDemandeAcces({
          npi,
          nom: nom.trim(),
          prenom: prenom.trim(),
          telephone_contact: telephoneContact.trim(),
        });
      }

      navigate(`${redirectBase}/${npi}`);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la création du dossier.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl w-full">
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
        label="NPI (Numéro Personnel d'Identification)"
        placeholder="Ex: 7123456789"
        value={npi}
        onChange={handleNpiChange}
        leadingIcon="badge"
        hint="10 chiffres strictement — attribué au patient dès sa première prise en charge."
        maxLength={10}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} required />
        <Input label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Date de naissance"
          type="date"
          value={dateNaissance}
          onChange={(e) => setDateNaissance(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Sexe</label>
          <select
            value={sexe}
            onChange={(e) => setSexe(e.target.value)}
            className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)" }}
          >
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Groupe sanguin (optionnel)</label>
        <select
          value={groupeSanguin}
          onChange={(e) => setGroupeSanguin(e.target.value)}
          className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
          style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)" }}
        >
          <option value="">Non renseigné</option>
          {GROUPES_SANGUINS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Tuteur — pour mineurs et nouveau-nés sans contact propre */}
      <div
        className="p-4 rounded-2xl border flex flex-col gap-3"
        style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-low)" }}
      >
        <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
          Tuteur / parent (optionnel — recommandé pour les mineurs et nouveau-nés)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nom du tuteur" value={tuteurNom} onChange={(e) => setTuteurNom(e.target.value)} placeholder="Ex: Mariam Kouassi" />
          <div className="flex flex-col gap-1">
            <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>Lien de parenté</label>
            <select
              value={lienParente}
              onChange={(e) => setLienParente(e.target.value)}
              className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
              style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)" }}
            >
              <option value="">Sélectionner...</option>
              {LIENS_PARENTE.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Demande d'accès portail */}
      <label className="flex items-start gap-3 p-4 rounded-2xl border cursor-pointer" style={{ borderColor: "var(--color-outline-variant)" }}>
        <input
          type="checkbox"
          checked={demandeAccesSouhaitee}
          onChange={(e) => setDemandeAccesSouhaitee(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="text-body-md font-semibold block" style={{ color: "var(--color-on-surface)" }}>
            Ce patient (ou son tuteur) souhaite un accès portail
          </span>
          <span className="text-caption block" style={{ color: "var(--color-on-surface-variant)" }}>
            Transmet une demande au Super Admin, seul habilité à créer un compte de connexion.
          </span>
        </span>
      </label>

      {demandeAccesSouhaitee && (
        <Input
          label="Téléphone de contact"
          value={telephoneContact}
          onChange={(e) => setTelephoneContact(e.target.value)}
          leadingIcon="call"
          placeholder="Ex: +229 97 00 00 00"
          required
        />
      )}

      <Button type="submit" icon="person_add" loading={loading}>
        Créer le dossier patient
      </Button>
    </form>
  );
}

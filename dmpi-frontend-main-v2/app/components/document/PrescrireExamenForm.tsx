// Formulaire de prescription d'un examen (radiographie, scanner, analyse de
// laboratoire...) à réaliser par un laboratoire partenaire. Le type d'examen
// est choisi dans un catalogue fermé (pas de saisie libre, pour éviter les
// doublons/fautes), et le laboratoire dans l'annuaire des partenaires.
// Volontairement non rattachée à une consultation précise : un patient peut
// avoir de nombreuses consultations au fil du temps, et les lister toutes
// systématiquement alourdirait inutilement la prescription.
import { useEffect, useMemo, useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import SelectRecherche from "../ui/SelectRecherche";
import {
  creerDemandeExamen,
  getTypesExamenDisponibles,
  type DemandeExamen,
  type CatalogueTypesExamen,
} from "../../services/demandeExamenService";
import { getPrestataires, type Prestataire } from "../../services/prestataireService";

interface PrescrireExamenFormProps {
  npi: string;
  onCreated: (demande: DemandeExamen) => void;
  onCancel: () => void;
}

export default function PrescrireExamenForm({ npi, onCreated, onCancel }: PrescrireExamenFormProps) {
  const [prestataireId, setPrestataireId] = useState("");
  const [typeExamen, setTypeExamen] = useState("");
  const [motif, setMotif] = useState("");
  const [laboratoires, setLaboratoires] = useState<Prestataire[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueTypesExamen>({});
  const [chargement, setChargement] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPrestataires(), getTypesExamenDisponibles()])
      .then(([prestataires, types]) => {
        setLaboratoires(prestataires.filter((p) => p.type === "laboratoire" && p.statut === "actif"));
        setCatalogue(types);
      })
      .catch(() => { setLaboratoires([]); setCatalogue({}); })
      .finally(() => setChargement(false));
  }, []);

  const optionsTypeExamen = useMemo(
    () => Object.entries(catalogue).flatMap(([categorie, libelles]) =>
      libelles.map((libelle) => ({ value: libelle, label: libelle, groupe: categorie }))
    ),
    [catalogue]
  );

  const optionsLaboratoires = useMemo(
    () => laboratoires.map((l) => ({ value: l.id, label: l.nom, sousLabel: l.commune ?? l.departement })),
    [laboratoires]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prestataireId) {
      setError("Veuillez choisir un laboratoire partenaire.");
      return;
    }
    if (!typeExamen) {
      setError("Veuillez choisir un type d'examen.");
      return;
    }
    setLoading(true);
    try {
      const demande = await creerDemandeExamen({
        npi,
        prestataire_id: prestataireId,
        type_examen: typeExamen,
        motif: motif || null,
      });
      onCreated(demande);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la prescription de l'examen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 rounded-xl text-caption font-medium" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Type d'examen</label>
        <SelectRecherche
          value={typeExamen}
          onChange={setTypeExamen}
          options={optionsTypeExamen}
          disabled={chargement}
          disabledMessage="Chargement…"
          rechercherPlaceholder="Rechercher un examen…"
          ariaLabel="Type d'examen"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Laboratoire partenaire</label>
        <SelectRecherche
          value={prestataireId}
          onChange={setPrestataireId}
          options={optionsLaboratoires}
          disabled={chargement}
          disabledMessage="Chargement…"
          rechercherPlaceholder="Rechercher un laboratoire…"
          ariaLabel="Laboratoire partenaire"
        />
        {!chargement && laboratoires.length === 0 && (
          <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
            Aucun laboratoire partenaire enregistré — contactez le super administrateur.
          </p>
        )}
      </div>

      <Input label="Motif (optionnel)" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : Suspicion de..." />

      <div className="flex gap-3 pt-2">
        <Button variant="outline" fullWidth type="button" onClick={onCancel} disabled={loading}>Annuler</Button>
        <Button fullWidth type="submit" loading={loading} icon="biotech">
          Prescrire l'examen
        </Button>
      </div>
    </form>
  );
}

// Formulaire Rédaction d'ordonnance
import { useState } from "react";
import { useNavigate } from "react-router";

import Card, { CardHeader } from "../ui/Card";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";

import { createPrescription } from "../../services/prescriptionService";
import { FREQUENCE_LABELS } from "../../types/prescription";
import type {
  CreatePrescriptionPayload,
  FrequenceMedicament,
  LigneMedicament,
} from "../../types/prescription";

interface PrescriptionFormProps {
  patientNpi: string;
  consultationId?: string;
  onCreated?: (prescriptionId: string) => void;
}

type DraftLigne = Omit<LigneMedicament, "id"> & { tempId: string };

function emptyLigne(): DraftLigne {
  return {
    tempId: `tmp_${Math.random().toString(36).slice(2, 9)}`,
    medicament: "",
    dosage: "",
    forme: "",
    posologie: "",
    frequence: "une_fois_par_jour",
    dureeJours: undefined,
    renouvelable: false,
    instructions: "",
  };
}

const FREQUENCE_OPTIONS = Object.entries(FREQUENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function PrescriptionForm({
  patientNpi,
  consultationId,
  onCreated,
}: PrescriptionFormProps) {
  const navigate = useNavigate();

  const [lignes, setLignes] = useState<DraftLigne[]>([emptyLigne()]);
  const [noteGlobale, setNoteGlobale] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateLigne = (tempId: string, patch: Partial<DraftLigne>) => {
    setLignes((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l))
    );
  };

  const addLigne = () => setLignes((prev) => [...prev, emptyLigne()]);

  const removeLigne = (tempId: string) => {
    setLignes((prev) => (prev.length > 1 ? prev.filter((l) => l.tempId !== tempId) : prev));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const incomplete = lignes.some((l) => !l.medicament.trim() || !l.dosage.trim());
    if (incomplete) {
      newErrors.global = "Chaque ligne doit au moins avoir un médicament et un dosage.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CreatePrescriptionPayload = {
        consultationId,
        patientNpi,
        lignes: lignes.map(({ tempId, ...rest }) => rest),
        noteGlobale: noteGlobale.trim() || undefined,
      };

      const created = await createPrescription(payload);

      if (onCreated) {
        onCreated(created.id);
      } else {
        navigate(`/medecin/dossier/${patientNpi}`);
      }
    } catch {
      setErrors({ global: "Une erreur est survenue lors de l'enregistrement." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {lignes.map((ligne, index) => (
        <Card key={ligne.tempId}>
          <CardHeader
            icon="medication"
            title={`Médicament ${index + 1}`}
            action={
              lignes.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeLigne(ligne.tempId)}
                  className="flex items-center gap-1 text-caption font-semibold"
                  style={{ color: "var(--color-error)" }}
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Retirer
                </button>
              ) : undefined
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Médicament"
              required
              placeholder="Ex: Metformine"
              value={ligne.medicament}
              onChange={(e) => updateLigne(ligne.tempId, { medicament: e.target.value })}
            />
            <Input
              label="Dosage"
              required
              placeholder="Ex: 500 mg"
              value={ligne.dosage}
              onChange={(e) => updateLigne(ligne.tempId, { dosage: e.target.value })}
            />
            <Input
              label="Forme"
              placeholder="Ex: Comprimé, gélule, sirop…"
              value={ligne.forme ?? ""}
              onChange={(e) => updateLigne(ligne.tempId, { forme: e.target.value })}
            />
            <Input
              label="Posologie"
              placeholder="Ex: 1 comprimé"
              value={ligne.posologie}
              onChange={(e) => updateLigne(ligne.tempId, { posologie: e.target.value })}
            />
            <Select
              label="Fréquence"
              options={FREQUENCE_OPTIONS}
              value={ligne.frequence}
              onChange={(e) =>
                updateLigne(ligne.tempId, {
                  frequence: e.target.value as FrequenceMedicament,
                })
              }
            />
            <Input
              label="Durée (jours)"
              type="number"
              placeholder="Ex: 30"
              value={ligne.dureeJours ?? ""}
              onChange={(e) =>
                updateLigne(ligne.tempId, {
                  dureeJours: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          <div className="mt-4">
            <Textarea
              label="Instructions particulières"
              rows={2}
              placeholder="Ex: À prendre au cours des repas"
              value={ligne.instructions ?? ""}
              onChange={(e) => updateLigne(ligne.tempId, { instructions: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={ligne.renouvelable}
              onChange={(e) => updateLigne(ligne.tempId, { renouvelable: e.target.checked })}
              className="w-4 h-4 rounded"
              style={{ accentColor: "var(--color-primary)" }}
            />
            <span className="text-body-md" style={{ color: "var(--color-on-surface)" }}>
              Renouvelable
            </span>
          </label>
        </Card>
      ))}

      <Button type="button" variant="outline" icon="add" onClick={addLigne} className="self-start">
        Ajouter un médicament
      </Button>

      <Card>
        <CardHeader icon="notes" title="Note globale" />
        <Textarea
          rows={3}
          placeholder="Recommandations générales, régime alimentaire, surveillance…"
          value={noteGlobale}
          onChange={(e) => setNoteGlobale(e.target.value)}
        />
      </Card>

      {errors.global && (
        <p className="text-body-md" style={{ color: "var(--color-error)" }}>
          {errors.global}
        </p>
      )}

      <div className="flex flex-wrap gap-3 justify-end sticky bottom-24 lg:bottom-4 z-30">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/medecin/dossier/${patientNpi}`)}
        >
          Annuler
        </Button>
        <Button type="submit" icon="prescriptions" loading={isSubmitting}>
          Signer l'ordonnance
        </Button>
      </div>
    </form>
  );
}

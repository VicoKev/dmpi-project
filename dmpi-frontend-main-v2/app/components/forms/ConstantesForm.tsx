// Formulaire enregistrement constantes vitales — Infirmier
import { useState } from "react";
import { useNavigate } from "react-router";
import Card, { CardHeader } from "../ui/Card";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { Constantes } from "../../types/consultation";

interface ConstantesFormProps {
  patientNpi: string;
  onSubmit: (constantes: Constantes, notes: string) => Promise<void>;
  isSubmitting: boolean;
}

const FIELDS: {
  key: keyof Constantes;
  label: string;
  unite: string;
  placeholder: string;
  icon: string;
  normalRange?: string;
}[] = [
  {
    key: "tensionSystolique",
    label: "Tension systolique",
    unite: "mmHg",
    placeholder: "120",
    icon: "favorite",
    normalRange: "100–140",
  },
  {
    key: "tensionDiastolique",
    label: "Tension diastolique",
    unite: "mmHg",
    placeholder: "80",
    icon: "favorite",
    normalRange: "60–90",
  },
  {
    key: "pouls",
    label: "Pouls",
    unite: "bpm",
    placeholder: "72",
    icon: "pulmonology",
    normalRange: "60–100",
  },
  {
    key: "frequenceRespiratoire",
    label: "Fréquence respiratoire",
    unite: "/min",
    placeholder: "16",
    icon: "air",
    normalRange: "12–20",
  },
  {
    key: "temperature",
    label: "Température",
    unite: "°C",
    placeholder: "37.0",
    icon: "thermometer",
    normalRange: "36.5–37.5",
  },
  {
    key: "saturationO2",
    label: "Saturation O₂",
    unite: "%",
    placeholder: "98",
    icon: "air",
    normalRange: "95–100",
  },
  {
    key: "glycemie",
    label: "Glycémie",
    unite: "g/L",
    placeholder: "1.0",
    icon: "water_drop",
    normalRange: "0.70–1.10",
  },
  {
    key: "poids",
    label: "Poids",
    unite: "kg",
    placeholder: "70",
    icon: "scale",
  },
  {
    key: "taille",
    label: "Taille",
    unite: "cm",
    placeholder: "170",
    icon: "height",
  },
];

function isAnormal(key: keyof Constantes, value: number | undefined): boolean {
  if (value === undefined) return false;
  const ranges: Partial<Record<keyof Constantes, [number, number]>> = {
    tensionSystolique: [100, 140],
    tensionDiastolique: [60, 90],
    pouls: [60, 100],
    frequenceRespiratoire: [12, 20],
    temperature: [36.5, 37.5],
    saturationO2: [95, 101],
    glycemie: [0.7, 1.1],
  };
  const range = ranges[key];
  if (!range) return false;
  return value < range[0] || value > range[1];
}

export default function ConstantesForm({
  patientNpi,
  onSubmit,
  isSubmitting,
}: ConstantesFormProps) {
  const navigate = useNavigate();
  const [rawConstantes, setRawConstantes] = useState<Partial<Record<keyof Constantes, string>>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof Constantes, raw: string) => {
    setRawConstantes((prev) => ({
      ...prev,
      [key]: raw,
    }));
  };

  const parseConstantes = (): Constantes => {
    const parsed: Constantes = {};
    for (const [key, val] of Object.entries(rawConstantes)) {
      if (val !== undefined && val !== "") {
        parsed[key as keyof Constantes] = parseFloat(val);
      }
    }
    return parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseConstantes();
    if (Object.keys(parsed).length === 0) {
      setError("Veuillez saisir au moins une constante vitale.");
      return;
    }
    setError(null);
    await onSubmit(parsed, notes);
  };

  // Alerte valeurs anormales
  const parsedConstantes = parseConstantes();
  const anormalKeys = FIELDS.filter((f) => isAnormal(f.key, parsedConstantes[f.key])).map(
    (f) => f.label
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader icon="monitor_heart" title="Constantes vitales" />

        {anormalKeys.length > 0 && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl mb-4 text-body-md"
            style={{
              backgroundColor: "var(--color-warning-container)",
              color: "var(--color-on-warning-container)",
            }}
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">warning</span>
            <span>
              <strong>Valeur(s) hors norme :</strong> {anormalKeys.join(", ")}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {FIELDS.map((field) => {
            const rawVal = rawConstantes[field.key] ?? "";
            const parsedVal = parsedConstantes[field.key];
            const anormal = isAnormal(field.key, parsedVal);
            return (
              <div key={field.key} className="flex flex-col gap-1">
                <Input
                  label={`${field.label} (${field.unite})`}
                  type="number"
                  step="0.1"
                  placeholder={field.placeholder}
                  value={rawVal}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  style={
                    anormal
                      ? { borderColor: "var(--color-error)", backgroundColor: "var(--color-error-container)" }
                      : {}
                  }
                />
                {field.normalRange && (
                  <p
                    className="text-caption px-1"
                    style={{
                      color: anormal ? "var(--color-error)" : "var(--color-on-surface-variant)",
                    }}
                  >
                    Norme : {field.normalRange}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader icon="notes" title="Notes infirmières" />
        <textarea
          className="w-full rounded-xl p-3 text-body-md resize-y min-h-[80px] border"
          placeholder="Observations particulières, comportement du patient, contexte…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{
            borderColor: "var(--color-outline-variant)",
            backgroundColor: "var(--color-surface-container-lowest)",
            color: "var(--color-on-surface)",
          }}
        />
      </Card>

      {error && (
        <p className="text-body-md" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 justify-end sticky bottom-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/infirmier/dossier/${patientNpi}`)}
        >
          Annuler
        </Button>
        <Button type="submit" icon="save" loading={isSubmitting}>
          Enregistrer les constantes
        </Button>
      </div>
    </form>
  );
}

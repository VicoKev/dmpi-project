// Formulaire Nouvelle Consultation
import { useState } from "react";
import { useNavigate } from "react-router";

import Card, { CardHeader } from "../ui/Card";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import Cim10Search from "./Cim10Search";

import { createConsultation } from "../../services/consultationService";
import type { Cim10Code, CreateConsultationPayload } from "../../types/consultation";

interface ConsultationFormProps {
  patientNpi: string;
  onCreated?: (consultationId: string) => void;
}

export default function ConsultationForm({ patientNpi, onCreated }: ConsultationFormProps) {
  const navigate = useNavigate();

  const [motif, setMotif] = useState("");
  const [examenClinique, setExamenClinique] = useState("");
  const [diagnosticPrincipal, setDiagnosticPrincipal] = useState<Cim10Code | null>(null);
  const [conclusion, setConclusion] = useState("");
  const [conduiteATenir, setConduiteATenir] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!motif.trim()) {
      newErrors.motif = "Le motif de consultation est obligatoire.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateConsultationPayload = {
        patientNpi,
        motif: motif.trim(),
        examenClinique: examenClinique.trim() || undefined,
        diagnosticPrincipal: diagnosticPrincipal ?? undefined,
        conclusion: conclusion.trim() || undefined,
        conduiteATenir: conduiteATenir.trim() || undefined,
      };

      const created = await createConsultation(payload);

      if (onCreated) {
        onCreated(created.id);
      } else {
        navigate(`/medecin/dossier/${patientNpi}`);
      }
    } catch (err) {
      setErrors({ global: "Une erreur est survenue lors de l'enregistrement." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Motif */}
      <Card>
        <CardHeader icon="edit_note" title="Motif de consultation" />
        <Textarea
          label="Motif"
          required
          rows={2}
          placeholder="Ex: Suivi diabète, douleurs abdominales, fièvre depuis 3 jours…"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          error={errors.motif}
        />
      </Card>

      {/* Examen clinique */}
      <Card>
        <CardHeader icon="stethoscope" title="Examen clinique" />
        <Textarea
          rows={4}
          placeholder="Observations de l'examen clinique…"
          value={examenClinique}
          onChange={(e) => setExamenClinique(e.target.value)}
        />
      </Card>

      {/* Diagnostic CIM-10 */}
      <Card>
        <CardHeader icon="diagnosis" title="Diagnostic (CIM-10)" />
        <Cim10Search
          value={diagnosticPrincipal}
          onChange={setDiagnosticPrincipal}
          label="Diagnostic principal"
        />
      </Card>

      {/* Conclusion médicale */}
      <Card>
        <CardHeader icon="fact_check" title="Conclusion médicale" />
        <div className="flex flex-col gap-4">
          <Textarea
            label="Conclusion"
            rows={3}
            placeholder="Synthèse et évaluation du médecin…"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
          />
          <Textarea
            label="Conduite à tenir"
            rows={3}
            placeholder="Recommandations, examens complémentaires, suivi…"
            value={conduiteATenir}
            onChange={(e) => setConduiteATenir(e.target.value)}
          />
        </div>
      </Card>

      {errors.global && (
        <p className="text-body-md" style={{ color: "var(--color-error)" }}>
          {errors.global}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-end sticky bottom-24 lg:bottom-4 z-30">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(`/medecin/dossier/${patientNpi}`)}
        >
          Annuler
        </Button>
        <Button type="submit" icon="save" loading={isSubmitting}>
          Enregistrer la consultation
        </Button>
      </div>
    </form>
  );
}

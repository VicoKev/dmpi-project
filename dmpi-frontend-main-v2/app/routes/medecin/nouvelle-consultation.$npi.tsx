// Page Nouvelle Consultation — Espace Médecin
import { useParams, useNavigate } from "react-router";
import Button from "../../components/ui/Button";
import ConsultationForm from "../../components/forms/ConsultationForm";

export default function NouvelleConsultationPage() {
  const { npi } = useParams<{ npi: string }>();
  const navigate = useNavigate();

  if (!npi) return null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Nouvelle consultation
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            NPI patient : {npi}
          </p>
        </div>
        <Button
          icon="arrow_back"
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/medecin/dossier/${npi}`)}
        >
          Retour au dossier
        </Button>
      </div>

      <ConsultationForm patientNpi={npi} />
    </div>
  );
}

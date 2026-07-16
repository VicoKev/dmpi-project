// Page Rédaction Ordonnance — Espace Médecin
import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import Button from "../../components/ui/Button";
import PrescriptionForm from "../../components/forms/PrescriptionForm";
import PharmaciesProchesCard from "../../components/prescription/PharmaciesProchesCard";

export default function NouvelleOrdonnancePage() {
  const { npi } = useParams<{ npi: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consultationId = searchParams.get("consultationId") ?? undefined;
  const [prescriptionCreeeId, setPrescriptionCreeeId] = useState<string | null>(null);

  if (!npi) return null;

  if (prescriptionCreeeId) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-success-container)" }}>
          <span className="material-symbols-outlined filled text-[24px]" style={{ color: "var(--color-success)" }}>check_circle</span>
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-success-container)" }}>
            Ordonnance enregistrée avec succès.
          </p>
        </div>

        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Voici des pharmacies partenaires à communiquer au patient s'il n'a pas de compte portail.
        </p>

        <PharmaciesProchesCard prescriptionId={prescriptionCreeeId} />

        <div className="flex justify-end">
          <Button icon="arrow_back" onClick={() => navigate(`/medecin/dossier/${npi}`)}>
            Retour au dossier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Rédiger une ordonnance
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

      <PrescriptionForm patientNpi={npi} consultationId={consultationId} onCreated={setPrescriptionCreeeId} />
    </div>
  );
}

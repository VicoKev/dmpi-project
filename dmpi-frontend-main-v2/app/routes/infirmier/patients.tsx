// Recherche patient — Espace Infirmier
import Card, { CardHeader } from "../../components/ui/Card";
import PatientSearch from "../../components/patient/PatientSearch";

export default function InfirmierPatients() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Recherche Patient
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Identification par NPI pour accéder au dossier et enregistrer des constantes ou administrations.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader icon="badge" title="Numéro Personnel d'Identification (NPI)" />
        <p className="text-body-md mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
          Saisissez le NPI à 10 chiffres du patient. Vous pourrez ensuite consulter son dossier,
          enregistrer ses constantes vitales ou tracer l'administration de ses médicaments.
        </p>
        <PatientSearch redirectBase="/infirmier/dossier" />
      </Card>
    </div>
  );
}

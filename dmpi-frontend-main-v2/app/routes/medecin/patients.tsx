// Recherche patient par NPI — Espace Médecin
import { Link } from "react-router";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PatientSearch from "../../components/patient/PatientSearch";

export default function MedecinPatients() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Recherche Patient
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Identification stricte par NPI pour ouvrir le dossier unique du patient.
          </p>
        </div>
        <Link to="/medecin/patients/nouveau">
          <Button icon="person_add" variant="outline" size="sm">Nouveau patient</Button>
        </Link>
      </div>

      <Card className="max-w-2xl">
        <CardHeader icon="badge" title="Numéro Personnel d'Identification" />
        <p className="text-body-md mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
          Saisissez le NPI à 10 chiffres du patient pour accéder à son dossier médical
          partagé, sans restriction, afin d'agir vite et de sauver des vies.
        </p>
        <PatientSearch />
      </Card>
    </div>
  );
}

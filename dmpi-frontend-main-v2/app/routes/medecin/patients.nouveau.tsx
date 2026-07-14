// Création d'un dossier patient — Espace Médecin
import { useNavigate } from "react-router";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import NouveauPatientForm from "../../components/patient/NouveauPatientForm";

export default function MedecinNouveauPatient() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Nouveau patient
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Création du dossier médical. Aucun compte de connexion n'est créé ici —
            cette étape reste réservée au Super Admin.
          </p>
        </div>
        <Button icon="arrow_back" variant="ghost" size="sm" onClick={() => navigate("/medecin/patients")}>
          Retour
        </Button>
      </div>

      <Card>
        <CardHeader icon="person_add" title="Identité et informations médicales de base" />
        <NouveauPatientForm redirectBase="/medecin/dossier" />
      </Card>
    </div>
  );
}

// Mes demandes d'accès patient — Espace Infirmier
import Card, { CardHeader } from "../../components/ui/Card";
import MesDemandesAccesList from "../../components/patient/MesDemandesAccesList";

export default function InfirmierDemandesAcces() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes demandes d'accès
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Suivi des demandes d'accès portail que vous avez soumises pour vos patients.
        </p>
      </div>

      <Card>
        <CardHeader icon="how_to_reg" title="Historique de mes demandes" />
        <MesDemandesAccesList />
      </Card>
    </div>
  );
}

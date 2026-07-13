// En-tête du dossier patient — identité, alertes critiques
import Card from "../ui/Card";
import Badge, { AllergieBadge } from "../ui/Badge";
import type { DossierPatient } from "../../types/patient";
import { calculerAge, formatDateFr } from "../../services/patientService";

interface DossierHeaderProps {
  dossier: DossierPatient;
}

export default function DossierHeader({ dossier }: DossierHeaderProps) {
  const { patient, allergies } = dossier;
  const age = calculerAge(patient.dateNaissance);
  const initials = `${patient.prenom[0] ?? ""}${patient.nom[0] ?? ""}`.toUpperCase();

  return (
    <Card accentBorder="border-l-4 border-[var(--color-primary)]">
      <div className="flex flex-col md:flex-row gap-5">
        {/* Avatar + identité */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {patient.avatarUrl ? (
            <img
              src={patient.avatarUrl}
              alt={`${patient.prenom} ${patient.nom}`}
              className="w-16 h-16 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-headline-sm shrink-0"
              style={{
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary-container)",
              }}
            >
              {initials}
            </div>
          )}

          <div className="min-w-0">
            <h1
              className="text-headline-md truncate"
              style={{ color: "var(--color-primary)" }}
            >
              {patient.prenom} {patient.nom}
            </h1>
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-body-md"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">badge</span>
                NPI : {patient.npi}
              </span>
              <span>•</span>
              <span>{age !== "-" ? `${age} ans` : "Âge non renseigné"}</span>
              <span>•</span>
              <span>{patient.sexe === "M" ? "Masculin" : patient.sexe === "F" ? "Féminin" : patient.sexe === "Autre" ? "Autre" : "Sexe non renseigné"}</span>
              <span>•</span>
              <span>{patient.dateNaissance ? `Né(e) le ${formatDateFr(patient.dateNaissance)}` : "Date de naissance non renseignée"}</span>
            </div>
          </div>
        </div>

        {/* Infos critiques : groupe sanguin + allergies */}
        <div className="flex flex-wrap items-start gap-2 md:justify-end md:min-w-[220px]">
          {patient.groupeSanguin && (
            <Badge variant="secondary" icon="bloodtype" size="md">
              Groupe {patient.groupeSanguin}
            </Badge>
          )}
          {allergies.length === 0 ? (
            <Badge variant="success" icon="check_circle" size="md">
              Aucune allergie connue
            </Badge>
          ) : (
            allergies.map((allergie) => (
              <AllergieBadge key={allergie.id} substance={allergie.substance} />
            ))
          )}
        </div>
      </div>

      {/* Ligne secondaire : coordonnées */}
      {(patient.telephone || patient.commune || patient.numeroAssurance) && (
        <div
          className="flex flex-wrap gap-x-5 gap-y-1 mt-4 pt-4 border-t text-caption"
          style={{
            borderColor: "var(--color-outline-variant)",
            color: "var(--color-on-surface-variant)",
          }}
        >
          {patient.telephone && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">call</span>
              {patient.telephone}
            </span>
          )}
          {patient.commune && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              {patient.commune}{patient.departement ? `, ${patient.departement}` : ""}
            </span>
          )}
          {patient.numeroAssurance && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              Assurance : {patient.numeroAssurance}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

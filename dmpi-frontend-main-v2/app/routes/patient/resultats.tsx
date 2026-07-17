// Mes Résultats d'examens — Espace Patient (lecture seule)
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import GalerieDocuments from "../../components/document/GalerieDocuments";
import { getDemandesExamenPatient, type DemandeExamen } from "../../services/demandeExamenService";
import { getDocumentsPatient, type DocumentMedical } from "../../services/documentMedicalService";
import { formatDateFr } from "../../services/patientService";

export default function PatientResultats() {
  const { user } = useAuth();
  const npi = user?.patientNpi;
  const [demandes, setDemandes] = useState<DemandeExamen[]>([]);
  const [documents, setDocuments] = useState<DocumentMedical[]>([]);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    if (!npi) { setLoading(false); return; }
    try {
      const [demandesData, documentsData] = await Promise.all([getDemandesExamenPatient(npi), getDocumentsPatient(npi)]);
      setDemandes(demandesData);
      setDocuments(documentsData);
    } finally {
      setLoading(false);
    }
  }, [npi]);

  useEffect(() => { charger(); }, [charger]);

  const demandesEnAttente = demandes.filter((d) => d.statut === "en_attente");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes résultats d'examens
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Vos examens biologiques, radiographies, scanners et comptes rendus médicaux.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Chargement de vos résultats…" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {demandesEnAttente.length > 0 && (
            <Card>
              <CardHeader icon="hourglass_empty" title={`Examens en attente de résultat (${demandesEnAttente.length})`} />
              <div className="flex flex-col gap-2">
                {demandesEnAttente.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl" style={{ backgroundColor: "var(--color-warning-container)" }}>
                    <div>
                      <p className="text-body-md font-semibold" style={{ color: "var(--color-on-warning-container)" }}>{d.type_examen}</p>
                      <p className="text-caption" style={{ color: "var(--color-on-warning-container)" }}>
                        {d.prestataire_nom ?? "Laboratoire"} · prescrit le {formatDateFr(d.created_at)}
                      </p>
                    </div>
                    <Badge variant="warning">En attente</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader icon="biotech" title="Résultats disponibles" />
            <GalerieDocuments documents={documents} loading={false} onChanged={charger} />
          </Card>
        </div>
      )}
    </div>
  );
}

// Vue Dossier Patient Unifié — Espace Médecin
// Affichage complet et sans restriction des données médicales (contexte d'urgence)
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";

import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import DossierHeader from "../../components/dossier/DossierHeader";
import DossierTabs, { type DossierTabKey } from "../../components/dossier/DossierTabs";
import AntecedentsCard from "../../components/dossier/AntecedentsCard";
import TraitementsCard from "../../components/dossier/TraitementsCard";
import HospitalisationsCard from "../../components/dossier/HospitalisationsCard";
import ConsultationList from "../../components/dossier/ConsultationList";
import PrescriptionList from "../../components/dossier/PrescriptionList";
import ExamensCard from "../../components/dossier/ExamensCard";
import VaccinationsCard from "../../components/dossier/VaccinationsCard";
import ConstanteRow from "../../components/dossier/ConstanteRow";

import { getDossierPatient } from "../../services/patientService";
import { getConsultationsByPatient } from "../../services/consultationService";
import { getPrescriptionsByPatient } from "../../services/prescriptionService";
import { getRelevesByPatient, type ReleveConstantes } from "../../services/constanstesService";

import type { DossierPatient } from "../../types/patient";
import type { Consultation } from "../../types/consultation";
import type { Prescription } from "../../types/prescription";

export default function DossierPatientPage() {
  const { npi } = useParams<{ npi: string }>();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState<DossierPatient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [releves, setReleves] = useState<ReleveConstantes[]>([]);
  const [activeTab, setActiveTab] = useState<DossierTabKey>("synthese");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!npi) return;

    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    async function loadAll() {
      const [dossierData, consultationsData, prescriptionsData, relevesData] = await Promise.all([
        getDossierPatient(npi!),
        getConsultationsByPatient(npi!),
        getPrescriptionsByPatient(npi!),
        getRelevesByPatient(npi!),
      ]);

      if (cancelled) return;

      if (!dossierData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setDossier(dossierData);
      setConsultations(consultationsData);
      setPrescriptions(prescriptionsData);
      setReleves(relevesData);
      setLoading(false);
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [npi]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" label="Chargement du dossier patient…" />
      </div>
    );
  }

  if (notFound || !dossier) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up">
        <Card>
          <CardHeader icon="error" title="Dossier introuvable" />
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Aucun patient ne correspond au NPI <strong>{npi}</strong>.
          </p>
          <Button
            icon="arrow_back"
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/medecin/patients")}
          >
            Retour à la recherche
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          icon="arrow_back"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/medecin/patients")}
        >
          Retour à la recherche
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/medecin/dossier/${npi}/modifier`}>
            <Button icon="edit" variant="outline" size="sm">
              Modifier le dossier
            </Button>
          </Link>
          <Link to={`/medecin/dossier/${npi}/consultation/nouvelle`}>
            <Button icon="add" variant="outline" size="sm">
              Nouvelle consultation
            </Button>
          </Link>
          <Link to={`/medecin/dossier/${npi}/ordonnance/nouvelle`}>
            <Button icon="prescriptions" size="sm">
              Rédiger une ordonnance
            </Button>
          </Link>
        </div>
      </div>

      {/* En-tête patient */}
      <DossierHeader dossier={dossier} />

      {/* Onglets */}
      <DossierTabs active={activeTab} onChange={setActiveTab} />

      {/* Contenu de l'onglet actif */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeTab === "synthese" && (
          <>
            <AntecedentsCard antecedents={dossier.antecedents} />
            <TraitementsCard traitements={dossier.traitementsEnCours} />
            <div className="lg:col-span-2">
              <h2 className="text-title-lg font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>
                Dernières consultations
              </h2>
              {consultations.length > 0 ? (
                <ConsultationList consultations={consultations.slice(0, 3)} />
              ) : (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucune consultation récente.</p>
              )}
            </div>
            <div className="lg:col-span-2">
              <h2 className="text-title-lg font-bold mb-4 mt-4" style={{ color: "var(--color-on-surface)" }}>
                Dernières ordonnances
              </h2>
              {prescriptions.length > 0 ? (
                <PrescriptionList prescriptions={prescriptions.slice(0, 3)} />
              ) : (
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>Aucune ordonnance récente.</p>
              )}
            </div>
            <div className="lg:col-span-2">
              <HospitalisationsCard hospitalisations={dossier.hospitalisations} />
            </div>
          </>
        )}

        {activeTab === "consultations" && (
          <div className="lg:col-span-2">
            <ConsultationList consultations={consultations} />
          </div>
        )}

        {activeTab === "constantes" && (
          <div className="lg:col-span-2 flex flex-col gap-4">
            {releves.length === 0 ? (
              <Card>
                <div className="flex flex-col items-center gap-2 py-8">
                  <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--color-outline)" }}>monitor_heart</span>
                  <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                    Aucun relevé de constantes enregistré pour ce patient.
                  </p>
                </div>
              </Card>
            ) : (
              releves.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-subheading font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        {" à "}
                        {new Date(r.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        Par {r.infirmier}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0">
                    <ConstanteRow label="Tension systolique" value={r.constantes.tensionSystolique} unite="mmHg" />
                    <ConstanteRow label="Tension diastolique" value={r.constantes.tensionDiastolique} unite="mmHg" />
                    <ConstanteRow label="Pouls" value={r.constantes.pouls} unite="bpm" />
                    <ConstanteRow label="Température" value={r.constantes.temperature} unite="°C" />
                    <ConstanteRow label="Saturation O₂" value={r.constantes.saturationO2} unite="%" />
                    <ConstanteRow label="Glycémie" value={r.constantes.glycemie} unite="g/L" />
                    <ConstanteRow label="Poids" value={r.constantes.poids} unite="kg" />
                    <ConstanteRow label="Taille" value={r.constantes.taille} unite="cm" />
                    <ConstanteRow label="Fréquence respiratoire" value={r.constantes.frequenceRespiratoire} unite="/min" />
                  </div>
                  {r.notes && (
                    <div
                      className="mt-3 p-3 rounded-xl text-body-md"
                      style={{
                        backgroundColor: "var(--color-surface-container-low)",
                        color: "var(--color-on-surface-variant)",
                      }}
                    >
                      <span className="font-semibold">Notes : </span>{r.notes}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === "ordonnances" && (
          <div className="lg:col-span-2">
            <PrescriptionList prescriptions={prescriptions} />
          </div>
        )}

        {activeTab === "examens" && (
          <div className="lg:col-span-2">
            <Card>
              <CardHeader icon="biotech" title="Examens & Biologie" />
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                Cette fonctionnalité n'est pas encore disponible dans cette version du MVP. Les résultats d'examens et de biologie seront intégrés prochainement.
              </p>
            </Card>
          </div>
        )}

        {activeTab === "vaccinations" && (
          <div className="lg:col-span-2">
            <VaccinationsCard vaccinations={dossier.vaccinations} />
          </div>
        )}
      </div>
    </div>
  );
}

// Vue Dossier Patient — Espace Infirmier
// Lecture du dossier (sans écriture consultation/ordonnance) + constantes + administrations
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";

import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import Spinner from "../../components/ui/Spinner";
import DossierHeader from "../../components/dossier/DossierHeader";
import AntecedentsCard from "../../components/dossier/AntecedentsCard";
import TraitementsCard from "../../components/dossier/TraitementsCard";
import VaccinationsCard from "../../components/dossier/VaccinationsCard";
import ConstanteRow from "../../components/dossier/ConstanteRow";

import { getDossierPatient, formatDateFr } from "../../services/patientService";
import { getRelevesByPatient, type ReleveConstantes } from "../../services/constanstesService";
import {
  getAdministrationsByPatient,
  type AdministrationMedicament,
} from "../../services/administrationService";
import type { DossierPatient } from "../../types/patient";

type InfirmierTabKey = "synthese" | "constantes" | "traitements";

const TABS: { key: InfirmierTabKey; icon: string; label: string }[] = [
  { key: "synthese", icon: "summarize", label: "Synthèse" },
  { key: "constantes", icon: "monitor_heart", label: "Constantes" },
  { key: "traitements", icon: "medication", label: "Administrations" },
];

export default function InfirmierDossierPage() {
  const { npi } = useParams<{ npi: string }>();
  const navigate = useNavigate();

  const [dossier, setDossier] = useState<DossierPatient | null>(null);
  const [releves, setReleves] = useState<ReleveConstantes[]>([]);
  const [administrations, setAdministrations] = useState<AdministrationMedicament[]>([]);
  const [activeTab, setActiveTab] = useState<InfirmierTabKey>("synthese");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!npi) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getDossierPatient(npi),
      getRelevesByPatient(npi),
      getAdministrationsByPatient(npi),
    ]).then(([d, r, a]) => {
      if (cancelled) return;
      if (!d) { setNotFound(true); setLoading(false); return; }
      setDossier(d);
      setReleves(r);
      setAdministrations(a);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [npi]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" label="Chargement du dossier…" />
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
          <Button icon="arrow_back" variant="outline" className="mt-4" onClick={() => navigate("/infirmier/patients")}>
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
        <Button icon="arrow_back" variant="ghost" size="sm" onClick={() => navigate("/infirmier/patients")}>
          Retour
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/infirmier/constantes`}>
            <Button icon="monitor_heart" variant="outline" size="sm">
              Relevé de constantes
            </Button>
          </Link>
          <Link to={`/infirmier/traitements`}>
            <Button icon="medication" size="sm">
              Administrer un traitement
            </Button>
          </Link>
        </div>
      </div>

      {/* En-tête patient */}
      <DossierHeader dossier={dossier} />

      {/* Onglets */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar p-1 rounded-2xl" style={{ backgroundColor: "var(--color-surface-container)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-body-md font-semibold transition-all whitespace-nowrap"
            style={
              activeTab === tab.key
                ? { backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-primary)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }
                : { color: "var(--color-on-surface-variant)" }
            }
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === "synthese" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AntecedentsCard antecedents={dossier.antecedents} />
          <TraitementsCard traitements={dossier.traitementsEnCours} />
          <div className="lg:col-span-2">
            <VaccinationsCard vaccinations={dossier.vaccinations} />
          </div>
        </div>
      )}

      {activeTab === "constantes" && (
        <div className="flex flex-col gap-4">
          {releves.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-8">
                <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--color-outline)" }}>monitor_heart</span>
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                  Aucun relevé de constantes enregistré pour ce patient.
                </p>
                <Link to="/infirmier/constantes">
                  <Button icon="add" variant="outline" size="sm" className="mt-2">Enregistrer des constantes</Button>
                </Link>
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
                      Par {r.infirmier} · {r.etablissement}
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

      {activeTab === "traitements" && (
        <div className="flex flex-col gap-4">
          {administrations.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-8">
                <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--color-outline)" }}>medication</span>
                <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                  Aucune administration de médicament enregistrée pour ce patient.
                </p>
                <Link to="/infirmier/traitements">
                  <Button icon="add" variant="outline" size="sm" className="mt-2">Enregistrer une administration</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader icon="medication" title="Historique des administrations" />
              <ul className="flex flex-col gap-3">
                {administrations.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: "var(--color-surface-container-low)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                        {a.medicament} — {a.dosage}
                      </p>
                      <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                        {formatDateFr(a.date)} · {new Date(a.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}{a.infirmier}
                      </p>
                      {a.notes && (
                        <p className="text-caption mt-1 italic" style={{ color: "var(--color-on-surface-variant)" }}>
                          {a.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-caption font-semibold px-2 py-1 rounded-full shrink-0"
                      style={{
                        backgroundColor: a.statut === "administre"
                          ? "var(--color-success-container)"
                          : a.statut === "refuse"
                          ? "var(--color-error-container)"
                          : "var(--color-warning-container)",
                        color: a.statut === "administre"
                          ? "var(--color-on-success-container)"
                          : a.statut === "refuse"
                          ? "var(--color-on-error-container)"
                          : "var(--color-on-warning-container)",
                      }}
                    >
                      {a.statut === "administre" ? "✓ Administré" : a.statut === "refuse" ? "✕ Refusé" : "⏱ Reporté"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

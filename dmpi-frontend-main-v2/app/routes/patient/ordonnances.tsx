// Mes Ordonnances — Espace Patient
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Badge, { StatutBadge } from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { useListePaginee } from "../../hooks/useListePaginee";
import { getPrescriptionsByPatientPaginee, ordonnanceIdDepuisPrescriptionId } from "../../services/prescriptionService";
import { getDossierPatient, formatDateFr } from "../../services/patientService";
import type { Prescription } from "../../types/prescription";
import { FREQUENCE_LABELS } from "../../types/prescription";
import type { Traitement } from "../../types/patient";
import PharmaciesProchesCard from "../../components/prescription/PharmaciesProchesCard";
import Pagination from "../../components/ui/Pagination";

const TAILLE_PAGE = 10;

function normaliserMedicament(nom: string): string {
  return nom.trim().toLowerCase();
}

/**
 * Fait correspondre une ligne d'ordonnance à son entrée dans
 * traitements_en_cours. Priorité au lien précis (ordonnanceId + ligneIndex),
 * enregistré pour toute ordonnance créée depuis l'introduction de ce champ.
 * À défaut (ordonnances plus anciennes, sans lien enregistré), repli sur un
 * rapprochement par nom de médicament — en ne considérant que les entrées
 * elles-mêmes sans lien précis, pour ne pas voler la correspondance d'une
 * autre ligne déjà identifiée avec certitude.
 */
function trouverTraitementCorrespondant(
  ordonnanceIdBrut: string,
  ligneIndex: number,
  medicament: string,
  traitements: Traitement[]
): Traitement | undefined {
  const precis = traitements.find(
    (t) => t.ordonnanceId === ordonnanceIdBrut && t.ligneIndex === ligneIndex
  );
  if (precis) return precis;

  const cible = normaliserMedicament(medicament);
  const correspondances = traitements.filter(
    (t) => !t.ordonnanceId && normaliserMedicament(t.medicament) === cible
  );
  if (correspondances.length === 0) return undefined;
  return correspondances.find((t) => t.actif) ?? correspondances[correspondances.length - 1];
}

function PrescriptionCard({ prescription: p, traitementsEnCours }: { prescription: Prescription; traitementsEnCours: Traitement[] }) {
  const ordonnanceIdBrut = ordonnanceIdDepuisPrescriptionId(p.id);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      {/* En-tête cliquable */}
      <button
        className="w-full flex items-center justify-between gap-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
            Ordonnance du {formatDateFr(p.date)}
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {p.prescripteur} · {p.etablissement}
          </p>
          <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
            {p.lignes.length} médicament{p.lignes.length > 1 ? "s" : ""}
            {p.lignes.some((l) => l.renouvelable) && " · Renouvelable"}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatutBadge statut={p.statut} />
          <span
            className="material-symbols-outlined text-[20px] transition-transform duration-200"
            style={{
              color: "var(--color-on-surface-variant)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            expand_more
          </span>
        </div>
      </button>

      {/* Détail dépliable */}
      {open && (
        <div className="mt-4 flex flex-col gap-3 animate-fade-in">
          {p.lignes.map((ligne, ligneIndex) => {
            const traitement = trouverTraitementCorrespondant(ordonnanceIdBrut, ligneIndex, ligne.medicament, traitementsEnCours);
            return (
            <div
              key={ligne.id}
              className="p-3 rounded-xl flex flex-col gap-1"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="material-symbols-outlined filled text-[18px]"
                  style={{ color: "var(--color-secondary)" }}
                >
                  medication
                </span>
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  {ligne.medicament} — {ligne.dosage}
                </p>
                {ligne.renouvelable && (
                  <span
                    className="text-caption font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-on-primary-container)",
                    }}
                  >
                    Renouvelable
                  </span>
                )}
                {traitement?.actif === false && (
                  <Badge variant="neutral" icon="block" size="sm">Arrêté</Badge>
                )}
              </div>
              {traitement?.actif === false && (
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  Traitement arrêté{traitement.dateFin ? ` le ${formatDateFr(traitement.dateFin)}` : ""}
                  {traitement.motifArret ? ` — ${traitement.motifArret}` : ""}
                </p>
              )}
              {ligne.forme && (
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  Forme : {ligne.forme}
                </p>
              )}
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                {ligne.posologie && `${ligne.posologie} · `}
                {FREQUENCE_LABELS[ligne.frequence]}
                {ligne.dureeJours && ` · ${ligne.dureeJours} jour(s)`}
              </p>
              {ligne.instructions && (
                <p className="text-caption italic" style={{ color: "var(--color-on-surface-variant)" }}>
                  ℹ {ligne.instructions}
                </p>
              )}
            </div>
            );
          })}

          {p.noteGlobale && (
            <div
              className="p-3 rounded-xl text-body-md"
              style={{
                backgroundColor: "var(--color-warning-container)",
                color: "var(--color-on-warning-container)",
              }}
            >
              <span className="font-semibold">Note du médecin : </span>
              {p.noteGlobale}
            </div>
          )}

          <PharmaciesProchesCard prescriptionId={p.id} />
        </div>
      )}
    </Card>
  );
}

export default function PatientOrdonnances() {
  const { user } = useAuth();
  const npi = user?.patientNpi;
  const { items: prescriptions, total, page, setPage, totalPages, loading } = useListePaginee<Prescription>(
    (skip, limit) => getPrescriptionsByPatientPaginee(npi!, skip, limit),
    { taillePage: TAILLE_PAGE, active: !!npi, deps: [npi] }
  );

  const [traitementsEnCours, setTraitementsEnCours] = useState<Traitement[]>([]);
  useEffect(() => {
    if (!npi) return;
    let cancelled = false;
    getDossierPatient(npi).then((dossier) => {
      if (!cancelled) setTraitementsEnCours(dossier?.traitementsEnCours ?? []);
    });
    return () => { cancelled = true; };
  }, [npi]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes ordonnances
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Toutes vos prescriptions médicales. Cliquez sur une ordonnance pour voir le détail.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner label="Chargement de vos ordonnances…" />
        </div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="material-symbols-outlined text-[48px]" style={{ color: "var(--color-outline)" }}>
              prescriptions
            </span>
            <p className="text-subheading" style={{ color: "var(--color-on-surface-variant)" }}>
              Aucune ordonnance enregistrée
            </p>
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Vos ordonnances apparaîtront ici après une consultation médicale.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {prescriptions.map((p) => (
            <PrescriptionCard key={p.id} prescription={p} traitementsEnCours={traitementsEnCours} />
          ))}
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} />
        </div>
      )}
    </div>
  );
}

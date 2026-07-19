// Import en masse d'établissements depuis un fichier Excel — Espace Super Admin.
// Flux en deux temps : valider le fichier (aucune écriture en base), puis
// confirmer explicitement la création des lignes valides retenues.
import { useRef, useState } from "react";
import Button from "../ui/Button";
import {
  telechargerModeleImportEtablissements,
  validerImportEtablissements,
  confirmerImportEtablissements,
  type RapportValidationImport,
  type ConfirmerImportResponse,
} from "../../services/etablissementService";

interface ImportEtablissementsModalProps {
  onCancel: () => void;
  onSuccess: (nombreCrees: number) => void;
}

type Etape = "upload" | "rapport" | "termine";

export default function ImportEtablissementsModal({ onCancel, onSuccess }: ImportEtablissementsModalProps) {
  const [etape, setEtape] = useState<Etape>("upload");
  const [fichier, setFichier] = useState<File | null>(null);
  const [rapport, setRapport] = useState<RapportValidationImport | null>(null);
  const [resultat, setResultat] = useState<ConfirmerImportResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTelechargerModele = async () => {
    try {
      await telechargerModeleImportEtablissements();
    } catch (err) {
      setError((err as Error).message || "Impossible de télécharger le modèle.");
    }
  };

  const handleFichierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFichier(e.target.files?.[0] ?? null);
    setError(null);
  };

  const handleValider = async () => {
    if (!fichier) {
      setError("Sélectionnez un fichier Excel (.xlsx) à valider.");
      return;
    }
    setValidating(true);
    setError(null);
    try {
      const r = await validerImportEtablissements(fichier);
      setRapport(r);
      setEtape("rapport");
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la validation du fichier.");
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmer = async () => {
    if (!rapport || rapport.lignes_valides.length === 0) return;
    setConfirming(true);
    setError(null);
    try {
      const r = await confirmerImportEtablissements(rapport.lignes_valides);
      setResultat(r);
      setEtape("termine");
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la création des établissements.");
    } finally {
      setConfirming(false);
    }
  };

  const recommencer = () => {
    setFichier(null);
    setRapport(null);
    setResultat(null);
    setError(null);
    setEtape("upload");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-3xl rounded-3xl p-6 sm:p-8 shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-primary-container)" }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-primary-container)" }}>upload_file</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>Importer des établissements</h2>
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Depuis un fichier Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container)]">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-surface)" }}>close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl text-caption font-medium" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            {error}
          </div>
        )}

        {etape === "upload" && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl border flex flex-col gap-3" style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-low)" }}>
              <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>1. Téléchargez le modèle</p>
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                Le modèle contient les colonnes attendues, un exemple rempli et la liste des valeurs autorisées
                (types, statuts, format de téléphone). Le département/commune/arrondissement/quartier doivent
                correspondre exactement au découpage territorial officiel, et la latitude/longitude sont obligatoires.
              </p>
              <Button variant="outline" icon="download" onClick={handleTelechargerModele}>Télécharger le modèle Excel</Button>
            </div>

            <div className="p-4 rounded-2xl border flex flex-col gap-3" style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-low)" }}>
              <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>2. Sélectionnez le fichier rempli</p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFichierChange}
                className="text-body-md"
              />
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                Aucun établissement n'est créé à cette étape — le fichier est d'abord entièrement vérifié, ligne par ligne.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth type="button" onClick={onCancel}>Annuler</Button>
              <Button fullWidth icon="fact_check" loading={validating} disabled={!fichier} onClick={handleValider}>
                Valider le fichier
              </Button>
            </div>
          </div>
        )}

        {etape === "rapport" && rapport && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl text-center" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                <p className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{rapport.total_lignes}</p>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Lignes lues</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ backgroundColor: "var(--color-success-container)" }}>
                <p className="text-headline-sm font-bold" style={{ color: "var(--color-on-success-container)" }}>{rapport.nombre_valides}</p>
                <p className="text-caption" style={{ color: "var(--color-on-success-container)" }}>Valides</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ backgroundColor: rapport.nombre_invalides > 0 ? "var(--color-error-container)" : "var(--color-surface-container-low)" }}>
                <p className="text-headline-sm font-bold" style={{ color: rapport.nombre_invalides > 0 ? "var(--color-on-error-container)" : "var(--color-on-surface)" }}>{rapport.nombre_invalides}</p>
                <p className="text-caption" style={{ color: rapport.nombre_invalides > 0 ? "var(--color-on-error-container)" : "var(--color-on-surface-variant)" }}>À corriger</p>
              </div>
            </div>

            {rapport.lignes_invalides.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  Lignes à corriger ({rapport.lignes_invalides.length})
                </p>
                <div className="overflow-x-auto -mx-2 sm:mx-0 max-h-64 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <table className="w-full text-caption min-w-[500px]">
                    <thead className="sticky top-0" style={{ backgroundColor: "var(--color-surface-container)" }}>
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Ligne</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Établissement</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Erreurs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapport.lignes_invalides.map((l) => (
                        <tr key={l.numero_ligne} className="border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                          <td className="px-3 py-2 align-top" style={{ color: "var(--color-on-surface)" }}>{l.numero_ligne || "—"}</td>
                          <td className="px-3 py-2 align-top" style={{ color: "var(--color-on-surface-variant)" }}>{l.valeurs_brutes?.nom || "—"}</td>
                          <td className="px-3 py-2 align-top" style={{ color: "var(--color-error)" }}>
                            <ul className="list-disc pl-4">
                              {l.erreurs.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                  Corrigez ces lignes dans le fichier Excel puis relancez la validation. Les lignes valides ci-dessous
                  peuvent être importées dès maintenant, indépendamment des lignes à corriger.
                </p>
              </div>
            )}

            {rapport.lignes_valides.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  Lignes prêtes à être importées ({rapport.lignes_valides.length})
                </p>
                <div className="overflow-x-auto -mx-2 sm:mx-0 max-h-48 overflow-y-auto rounded-xl border" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <table className="w-full text-caption min-w-[500px]">
                    <thead className="sticky top-0" style={{ backgroundColor: "var(--color-surface-container)" }}>
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Ligne</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Établissement</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Localisation</th>
                        <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Téléphone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rapport.lignes_valides.map((l) => (
                        <tr key={l.numero_ligne} className="border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
                          <td className="px-3 py-2" style={{ color: "var(--color-on-surface)" }}>{l.numero_ligne}</td>
                          <td className="px-3 py-2" style={{ color: "var(--color-on-surface)" }}>{l.donnees.nom}</td>
                          <td className="px-3 py-2" style={{ color: "var(--color-on-surface-variant)" }}>{l.donnees.commune}, {l.donnees.departement}</td>
                          <td className="px-3 py-2" style={{ color: "var(--color-on-surface-variant)" }}>{l.donnees.telephone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth icon="restart_alt" onClick={recommencer}>Recommencer</Button>
              <Button
                fullWidth
                icon="cloud_upload"
                loading={confirming}
                disabled={rapport.lignes_valides.length === 0}
                onClick={handleConfirmer}
              >
                Importer {rapport.lignes_valides.length} établissement{rapport.lignes_valides.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {etape === "termine" && resultat && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-success-container)" }}>
              <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--color-on-success-container)" }}>check_circle</span>
            </div>
            <div>
              <p className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
                {resultat.nombre_crees} établissement{resultat.nombre_crees > 1 ? "s" : ""} créé{resultat.nombre_crees > 1 ? "s" : ""}
              </p>
              <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
                Ils apparaissent désormais dans le réseau DMPI Bénin.
              </p>
            </div>
            <Button icon="done" onClick={() => onSuccess(resultat.nombre_crees)}>Terminer</Button>
          </div>
        )}
      </div>
    </div>
  );
}

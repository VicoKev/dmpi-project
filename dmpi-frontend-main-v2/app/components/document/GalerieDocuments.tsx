// Galerie de documents médicaux (radiographies, scanners, résultats de labo...)
// réutilisée à l'identique côté médecin (ExamensCard) et côté patient (resultats.tsx).
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Textarea from "../ui/Textarea";
import { formatDateFr } from "../../services/patientService";
import {
  obtenirUrlFichier,
  telechargerFichier,
  definirInterpretation,
  TYPE_DOCUMENT_LABELS,
  type DocumentMedical,
  type FichierMedical,
} from "../../services/documentMedicalService";
import VisionneuseDocument from "./VisionneuseDocument";
import UploadDocumentForm from "./UploadDocumentForm";

const NOUVEAU_SEUIL_JOURS = 7;

function estNouveau(dateIso: string): boolean {
  const diffJours = (Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24);
  return diffJours <= NOUVEAU_SEUIL_JOURS;
}

const TYPE_ICONS: Record<string, string> = {
  radiographie: "personal_injury",
  scanner: "medical_information",
  echographie: "pregnant_woman",
  irm: "neurology",
  biologie: "biotech",
  anatomopathologie: "microbiology",
  ecg: "monitor_heart",
  autre: "description",
};

function VignetteFichier({ document: doc, fichier, onClick }: { document: DocumentMedical; fichier: FichierMedical; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fichier.a_une_vignette) return;
    let urlLocale: string | null = null;
    let annule = false;
    obtenirUrlFichier(doc.id, fichier.id, true)
      .then((u) => {
        if (annule) { URL.revokeObjectURL(u); return; }
        urlLocale = u;
        setUrl(u);
      })
      .catch(() => {});
    return () => {
      annule = true;
      if (urlLocale) URL.revokeObjectURL(urlLocale);
    };
  }, [doc.id, fichier.id, fichier.a_une_vignette]);

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className="relative w-full aspect-square rounded-xl overflow-hidden border flex items-center justify-center shrink-0"
        style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-low)", width: "88px", height: "88px" }}
        title={fichier.nom_original}
        aria-label={`Ouvrir ${fichier.nom_original}`}
      >
        {url ? (
          <img src={url} alt={fichier.nom_original} className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-[32px]" style={{ color: "var(--color-outline)" }}>
            {fichier.type_mime === "application/pdf" ? "picture_as_pdf" : "image"}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => telechargerFichier(doc.id, fichier)}
        className="flex items-center gap-0.5 text-caption font-semibold"
        style={{ color: "var(--color-primary)" }}
        title={`Télécharger ${fichier.nom_original}`}
      >
        <span className="material-symbols-outlined text-[14px]">download</span>
        Télécharger
      </button>
    </div>
  );
}

function InterpretationSection({ document: doc, peutInterpreter, onChanged }: { document: DocumentMedical; peutInterpreter: boolean; onChanged: () => void }) {
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(doc.interpretation_medecin ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enregistrer = async () => {
    if (!texte.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await definirInterpretation(doc.id, texte.trim());
      setEdition(false);
      onChanged();
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  if (!doc.interpretation_medecin && !peutInterpreter) return null;

  if (edition) {
    return (
      <div
        className="mt-3 p-3 rounded-xl flex flex-col gap-2.5"
        style={{ backgroundColor: "var(--color-surface-container-low)", border: "1px solid var(--color-outline-variant)" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--color-primary)" }}>stethoscope</span>
          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>Interprétation médecin</p>
        </div>
        <Textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={3}
          placeholder="Expliquez le résultat au dossier du patient..."
          autoFocus
          className="gap-0!"
        />
        {error && <p className="text-caption" style={{ color: "var(--color-error)" }}>{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" icon="save" loading={loading} onClick={enregistrer} disabled={!texte.trim()}>Enregistrer</Button>
          <Button size="sm" variant="outline" onClick={() => { setEdition(false); setTexte(doc.interpretation_medecin ?? ""); }}>Annuler</Button>
        </div>
      </div>
    );
  }

  if (!doc.interpretation_medecin) {
    return (
      <button
        type="button"
        onClick={() => setEdition(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-body-md font-semibold transition-colors duration-150"
        style={{ borderColor: "var(--color-outline-variant)", color: "var(--color-primary)" }}
      >
        <span className="material-symbols-outlined text-[18px]">add_comment</span>
        Ajouter une interprétation médicale
      </button>
    );
  }

  return (
    <div
      className="mt-3 pl-3 py-2.5 pr-2.5 rounded-r-xl flex flex-col gap-1.5"
      style={{ backgroundColor: "var(--color-surface-container-low)", borderLeft: "3px solid var(--color-primary)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: "var(--color-primary)" }}>stethoscope</span>
          <div className="min-w-0">
            <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>Interprétation médecin</p>
            {doc.interpretation_par_email && (
              <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>{doc.interpretation_par_email}</p>
            )}
          </div>
        </div>
        {peutInterpreter && (
          <button
            type="button"
            onClick={() => setEdition(true)}
            className="flex items-center gap-1 text-caption font-semibold shrink-0"
            style={{ color: "var(--color-primary)" }}
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Modifier
          </button>
        )}
      </div>
      <p className="text-body-md leading-relaxed" style={{ color: "var(--color-on-surface)" }}>{doc.interpretation_medecin}</p>
    </div>
  );
}

interface GalerieDocumentsProps {
  documents: DocumentMedical[];
  loading?: boolean;
  /** Appelé après une modification (édition ou interprétation) pour que le
   * parent recharge la liste — GalerieDocuments ne gère pas son propre fetch. */
  onChanged?: () => void;
}

export default function GalerieDocuments({ documents, loading, onChanged }: GalerieDocumentsProps) {
  const { user } = useAuth();
  const [ouvert, setOuvert] = useState<{ document: DocumentMedical; fichier: FichierMedical } | null>(null);
  const [enEdition, setEnEdition] = useState<DocumentMedical | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
        <span className="material-symbols-outlined text-[40px] opacity-40">biotech</span>
        <p className="text-body-md">Aucun document médical enregistré pour le moment.</p>
      </div>
    );
  }

  const peutInterpreter = user?.role === "medecin";

  return (
    <>
      <ul className="flex flex-col gap-3">
        {documents.map((doc) => {
          const estAuteur = user?.email === doc.uploade_par_email && (user?.role === "medecin" || user?.role === "laboratoire");
          return (
            <li key={doc.id} className="p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[20px] mt-0.5 shrink-0" style={{ color: "var(--color-primary)" }}>
                    {TYPE_ICONS[doc.type] ?? "description"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold truncate" style={{ color: "var(--color-on-surface)" }}>
                      {doc.libelle}
                      {estNouveau(doc.created_at) && (
                        <span
                          className="text-caption font-semibold px-2 py-0.5 rounded-full ml-2"
                          style={{ backgroundColor: "var(--color-tertiary-container)", color: "var(--color-on-tertiary-container)" }}
                        >
                          Nouveau
                        </span>
                      )}
                    </p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      {TYPE_DOCUMENT_LABELS[doc.type] ?? doc.type} · {formatDateFr(doc.date_realisation)}
                      {doc.laboratoire_nom ? ` · ${doc.laboratoire_nom}` : ""}
                    </p>
                  </div>
                </div>
                {estAuteur && (
                  <button
                    type="button"
                    onClick={() => setEnEdition(doc)}
                    className="flex items-center gap-1 text-caption font-semibold shrink-0"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Modifier
                  </button>
                )}
              </div>

              {doc.commentaire && (
                <p className="text-caption mb-2" style={{ color: "var(--color-on-surface-variant)" }}>{doc.commentaire}</p>
              )}

              <div className="flex gap-2 flex-wrap">
                {doc.fichiers.map((fichier) => (
                  <VignetteFichier
                    key={fichier.id}
                    document={doc}
                    fichier={fichier}
                    onClick={() => setOuvert({ document: doc, fichier })}
                  />
                ))}
              </div>

              <InterpretationSection
                document={doc}
                peutInterpreter={peutInterpreter}
                onChanged={() => onChanged?.()}
              />
            </li>
          );
        })}
      </ul>

      {ouvert && (
        <VisionneuseDocument
          document={ouvert.document}
          fichier={ouvert.fichier}
          onClose={() => setOuvert(null)}
        />
      )}

      {enEdition && (
        <Modal onClose={() => setEnEdition(null)} labelledBy="modifier-document-title" maxWidth="max-w-lg" className="max-h-[90vh] overflow-y-auto">
          <h2 id="modifier-document-title" className="text-headline-sm font-bold mb-4" style={{ color: "var(--color-on-surface)" }}>Modifier le document</h2>
          <UploadDocumentForm
            npi={enEdition.npi}
            documentExistant={enEdition}
            onUploaded={() => { setEnEdition(null); onChanged?.(); }}
            onCancel={() => setEnEdition(null)}
          />
        </Modal>
      )}
    </>
  );
}

// Formulaire de dépôt d'un document médical (radiographie, scanner, résultat
// de laboratoire...) — utilisé côté médecin (upload libre ou rattaché à une
// demande d'examen qu'il a prescrite) et côté laboratoire (dépôt d'un
// résultat pour une demande qui lui est adressée). Réutilisé aussi en mode
// modification (documentExistant fourni) : l'auteur d'origine corrige une
// erreur de saisie, et peut remplacer le(s) fichier(s) si besoin.
import { useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import ZoneDepotFichiers from "./ZoneDepotFichiers";
import {
  uploaderDocument,
  modifierDocument,
  TYPE_DOCUMENT_LABELS,
  type DocumentMedical,
  type TypeDocumentMedical,
} from "../../services/documentMedicalService";

const TYPES = Object.keys(TYPE_DOCUMENT_LABELS) as TypeDocumentMedical[];
const FORMATS_ACCEPTES = "image/jpeg,image/png,application/pdf";
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

interface UploadDocumentFormProps {
  npi: string;
  demandeExamenId?: string | null;
  typeParDefaut?: TypeDocumentMedical;
  libelleParDefaut?: string;
  /** Si fourni, le formulaire passe en mode modification de ce document. */
  documentExistant?: DocumentMedical;
  onUploaded: (document: DocumentMedical) => void;
  onCancel: () => void;
}

export default function UploadDocumentForm({
  npi,
  demandeExamenId,
  typeParDefaut = "autre",
  libelleParDefaut = "",
  documentExistant,
  onUploaded,
  onCancel,
}: UploadDocumentFormProps) {
  const modeModification = !!documentExistant;
  const [type, setType] = useState<TypeDocumentMedical>(documentExistant?.type ?? typeParDefaut);
  const [libelle, setLibelle] = useState(documentExistant?.libelle ?? libelleParDefaut);
  const [dateRealisation, setDateRealisation] = useState(
    documentExistant?.date_realisation.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  );
  const [commentaire, setCommentaire] = useState(documentExistant?.commentaire ?? "");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFichiersChange = (selection: File[]) => {
    const tropVolumineux = selection.find((f) => f.size > TAILLE_MAX_OCTETS);
    if (tropVolumineux) {
      setError(`« ${tropVolumineux.name} » dépasse la taille maximale de 10 Mo.`);
      return;
    }
    if (selection.length > 5) {
      setError("5 fichiers maximum par dépôt.");
      return;
    }
    setError(null);
    setFichiers(selection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!modeModification && fichiers.length === 0) {
      setError("Sélectionnez au moins un fichier (JPEG, PNG ou PDF).");
      return;
    }
    if (!libelle.trim()) {
      setError("Le libellé est requis.");
      return;
    }
    setLoading(true);
    try {
      const document = modeModification
        ? await modifierDocument(documentExistant!.id, {
            type,
            libelle,
            date_realisation: dateRealisation,
            commentaire: commentaire || null,
            fichiers: fichiers.length > 0 ? fichiers : undefined,
          })
        : await uploaderDocument({
            npi,
            demande_examen_id: demandeExamenId ?? null,
            type,
            libelle,
            date_realisation: dateRealisation,
            commentaire: commentaire || null,
            fichiers,
          });
      onUploaded(document);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'enregistrement du document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="p-3 rounded-xl text-caption font-medium" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Type de document</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeDocumentMedical)}
            className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
            style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-on-surface)" }}
          >
            {TYPES.map((t) => <option key={t} value={t}>{TYPE_DOCUMENT_LABELS[t]}</option>)}
          </select>
        </div>
        <Input
          label="Date de réalisation"
          type="date"
          value={dateRealisation}
          onChange={(e) => setDateRealisation(e.target.value)}
          required
        />
      </div>

      <Input label="Libellé" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex : Scanner cérébral, NFS complète..." required />

      <Input label="Commentaire (optionnel)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />

      <div className="flex flex-col gap-1.5">
        <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
          {modeModification ? "Remplacer le(s) fichier(s) (optionnel)" : "Fichier(s)"}
        </label>
        {modeModification && (
          <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
            Laissez vide pour conserver le(s) fichier(s) actuel(s). Sélectionner un fichier remplace intégralement les précédents.
          </p>
        )}
        <ZoneDepotFichiers
          fichiers={fichiers}
          onFichiersChange={handleFichiersChange}
          accept={FORMATS_ACCEPTES}
          titre={modeModification ? "Cliquez ou glissez un fichier ici pour le remplacer" : "Cliquez pour choisir un fichier, ou glissez-le ici"}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" fullWidth type="button" onClick={onCancel} disabled={loading}>Annuler</Button>
        <Button fullWidth type="submit" loading={loading} icon={modeModification ? "save" : "upload"}>
          {modeModification ? "Enregistrer les modifications" : "Déposer le document"}
        </Button>
      </div>
    </form>
  );
}

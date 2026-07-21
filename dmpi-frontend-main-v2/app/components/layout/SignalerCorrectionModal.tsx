// Modale "Signaler une erreur sur mon compte" — accessible depuis n'importe quel rôle
import { useState } from "react";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import Modal, { ModalHeader } from "../ui/Modal";
import ZoneDepotFichiers from "../document/ZoneDepotFichiers";
import { signalerCorrectionCompte } from "../../services/authService";

interface SignalerCorrectionModalProps {
  onClose: () => void;
}

export default function SignalerCorrectionModal({ onClose }: SignalerCorrectionModalProps) {
  const [motif, setMotif] = useState("");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (motif.trim().length < 5) {
      setError("Décrivez brièvement l'erreur (5 caractères minimum).");
      return;
    }
    if (fichiers.length === 0) {
      setError("Joignez un justificatif (pièce d'identité, diplôme, attestation...) : sans lui, le Super Administrateur ne peut pas vérifier l'information avant de modifier votre compte.");
      return;
    }

    setLoading(true);
    try {
      await signalerCorrectionCompte(motif.trim(), fichiers[0]);
      setSucces(true);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'envoi du signalement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="signaler-correction-title">
      <ModalHeader icon="edit_note" title="Signaler une erreur sur mon compte" titleId="signaler-correction-title" onClose={onClose} />

      {succes ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-success-container)" }}>
              <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--color-on-success-container)" }}>check_circle</span>
            </div>
            <p className="text-body-md" style={{ color: "var(--color-on-surface)" }}>
              Signalement transmis au Super Administrateur national.
            </p>
            <Button icon="done" onClick={onClose}>Terminer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Nom, prénom, email, spécialité... ne sont modifiables que par le Super Administrateur national.
              Décrivez ce qui doit être corrigé, il traitera votre demande.
            </p>

            {error && (
              <div className="p-3 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
                {error}
              </div>
            )}

            <Textarea
              label="Que faut-il corriger ?"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : mon nom est mal orthographié, c'est « Kouassi » et non « Kwasi »."
              rows={4}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
                Justificatif <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <ZoneDepotFichiers
                fichiers={fichiers}
                onFichiersChange={(f) => setFichiers(f.slice(0, 1))}
                accept="image/jpeg,image/png,application/pdf"
                multiple={false}
                titre="Cliquez pour joindre un justificatif, ou glissez-le ici"
                sousTitre="Pièce d'identité, diplôme, attestation d'exercice... — JPEG, PNG ou PDF, 10 Mo max"
              />
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                Obligatoire : sans lui, le Super Administrateur ne peut pas vérifier l'information avant de modifier votre compte.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth type="button" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button fullWidth type="submit" icon="send" loading={loading}>
                Envoyer
              </Button>
            </div>
          </form>
        )}
    </Modal>
  );
}

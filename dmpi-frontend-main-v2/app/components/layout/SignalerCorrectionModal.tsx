// Modale "Signaler une erreur sur mon compte" — accessible depuis n'importe quel rôle
import { useState } from "react";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import { signalerCorrectionCompte } from "../../services/authService";

interface SignalerCorrectionModalProps {
  onClose: () => void;
}

export default function SignalerCorrectionModal({ onClose }: SignalerCorrectionModalProps) {
  const [motif, setMotif] = useState("");
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

    setLoading(true);
    try {
      await signalerCorrectionCompte(motif.trim());
      setSucces(true);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'envoi du signalement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-down"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-primary-container)" }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-primary-container)" }}>edit_note</span>
            </div>
            <h2 className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
              Signaler une erreur sur mon compte
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container)]">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-surface)" }}>close</span>
          </button>
        </div>

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
      </div>
    </div>
  );
}

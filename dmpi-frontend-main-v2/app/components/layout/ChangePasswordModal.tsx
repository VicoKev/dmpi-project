// Modale "Changer mon mot de passe" — accessible depuis n'importe quel rôle
import { useState } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Modal, { ModalHeader } from "../ui/Modal";
import { changerMonMotDePasse } from "../../services/authService";

interface ChangePasswordModalProps {
  onClose: () => void;
}

export default function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [ancien, setAncien] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nouveau.length < 8) {
      setError("Le nouveau mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    if (nouveau !== confirmation) {
      setError("Les deux saisies du nouveau mot de passe ne correspondent pas.");
      return;
    }
    if (nouveau === ancien) {
      setError("Le nouveau mot de passe doit être différent de l'actuel.");
      return;
    }

    setLoading(true);
    try {
      await changerMonMotDePasse(ancien, nouveau);
      setSucces(true);
    } catch (err) {
      setError((err as Error).message || "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="change-password-title">
      <ModalHeader icon="lock_reset" title="Changer mon mot de passe" titleId="change-password-title" onClose={onClose} />

      {succes ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-success-container)" }}>
              <span className="material-symbols-outlined text-[28px]" style={{ color: "var(--color-on-success-container)" }}>check_circle</span>
            </div>
            <p className="text-body-md" style={{ color: "var(--color-on-surface)" }}>
              Mot de passe modifié avec succès.
            </p>
            <Button icon="done" onClick={onClose}>Terminer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
                {error}
              </div>
            )}

            <Input
              label="Mot de passe actuel"
              type="password"
              value={ancien}
              onChange={(e) => setAncien(e.target.value)}
              leadingIcon="lock"
              required
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
              leadingIcon="key"
              hint="8 caractères minimum"
              required
            />
            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              leadingIcon="key"
              required
            />

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth type="button" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button fullWidth type="submit" icon="save" loading={loading}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
    </Modal>
  );
}

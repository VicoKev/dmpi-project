// Bouton + modale : demander un accès portail pour un patient dont le dossier existe déjà.
// Partagé médecin/infirmier — ne crée qu'une demande, jamais de compte (réservé au Super Admin).
import { useState, useEffect } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { createDemandeAcces, compteExistantPourNpi } from "../../services/demandeAccesService";
import { validateTelephoneBenin, TELEPHONE_BENIN_HINT, TELEPHONE_BENIN_PLACEHOLDER } from "../../utils/telephone";

interface DemanderAccesButtonProps {
  npi: string;
  nom: string;
  prenom: string;
  telephoneDefault?: string;
}

export default function DemanderAccesButton({ npi, nom, prenom, telephoneDefault }: DemanderAccesButtonProps) {
  const [open, setOpen] = useState(false);
  const [telephone, setTelephone] = useState(telephoneDefault ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envoyee, setEnvoyee] = useState(false);
  // null = vérification en cours : on n'affiche ni le bouton ni le badge tant qu'on ne sait pas.
  const [compteExistant, setCompteExistant] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    compteExistantPourNpi(npi)
      .then((existe) => {
        if (!cancelled) setCompteExistant(existe);
      })
      .catch(() => {
        // En cas d'échec de la vérification, on ne bloque pas le professionnel : le backend
        // refera de toute façon le contrôle définitif au moment de l'envoi de la demande.
        if (!cancelled) setCompteExistant(false);
      });
    return () => {
      cancelled = true;
    };
  }, [npi]);

  const ouvrir = () => {
    setError(null);
    setTelephone(telephoneDefault ?? "");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!telephone.trim()) {
      setError("Le téléphone de contact est requis.");
      return;
    }
    if (!validateTelephoneBenin(telephone)) {
      setError(TELEPHONE_BENIN_HINT);
      return;
    }

    setLoading(true);
    try {
      await createDemandeAcces({ npi, nom, prenom, telephone_contact: telephone.trim() });
      setEnvoyee(true);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'envoi de la demande.");
    } finally {
      setLoading(false);
    }
  };

  if (compteExistant === null) {
    // Vérification en cours — pas de saut visuel : on n'affiche rien tant qu'on ne sait pas.
    return null;
  }

  if (compteExistant) {
    return (
      <span
        className="text-caption font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1"
        style={{ backgroundColor: "var(--color-success-container)", color: "var(--color-on-success-container)" }}
      >
        <span className="material-symbols-outlined text-[16px]">verified</span>
        Compte déjà créé
      </span>
    );
  }

  return (
    <>
      <Button icon="how_to_reg" variant="outline" size="sm" onClick={ouvrir} disabled={envoyee}>
        {envoyee ? "Demande envoyée" : "Demander un accès portail"}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            <h2 className="text-headline-sm font-bold mb-1" style={{ color: "var(--color-on-surface)" }}>
              Demander un accès portail
            </h2>
            <p className="text-body-md mb-4" style={{ color: "var(--color-on-surface-variant)" }}>
              {prenom} {nom} — NPI {npi}
            </p>

            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded-xl mb-4 text-body-md"
                style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}
              >
                <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Téléphone de contact"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                leadingIcon="call"
                placeholder={TELEPHONE_BENIN_PLACEHOLDER}
                hint={TELEPHONE_BENIN_HINT}
                required
              />
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                Transmis au Super Admin, seul habilité à créer le compte de connexion.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" fullWidth type="button" onClick={() => setOpen(false)} disabled={loading}>
                  Annuler
                </Button>
                <Button fullWidth type="submit" icon="send" loading={loading}>
                  Envoyer la demande
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

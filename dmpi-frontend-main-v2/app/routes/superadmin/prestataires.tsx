// Gestion des prestataires partenaires (pharmacies, laboratoires) — Espace Super Admin National
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { useConfirm } from "../../contexts/ConfirmContext";
import Card, { CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import LocalisationPicker, { type LocalisationValue } from "../../components/etablissement/LocalisationPicker";
import HorairesPicker from "../../components/ui/HorairesPicker";
import {
  getPrestataires,
  createPrestataire,
  updatePrestataire,
  deactivatePrestataire,
  reactivatePrestataire,
  TYPE_PRESTATAIRE_OPTIONS,
  type Prestataire,
  type PrestataireCreatePayload,
} from "../../services/prestataireService";
import { getUsers } from "../../services/userService";

const LOCALISATION_VIDE: LocalisationValue = {
  ville: "", departement: "", commune: "", arrondissement: "", quartier: "", adresse: "", latitude: null, longitude: null,
};

const TYPE_LABELS: Record<string, string> = {
  pharmacie: "Pharmacie",
  laboratoire: "Laboratoire",
};

interface PrestataireFormProps {
  initial?: Prestataire | null;
  onSuccess: (p: Prestataire) => void;
  onCancel: () => void;
}

function PrestataireForm({ initial, onSuccess, onCancel }: PrestataireFormProps) {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [type, setType] = useState<string>(initial?.type ?? "pharmacie");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [horaires, setHoraires] = useState(initial?.horaires ?? "");
  const [localisation, setLocalisation] = useState<LocalisationValue>(
    initial ? {
      ville: "", departement: initial.departement,
      commune: initial.commune ?? "", arrondissement: initial.arrondissement ?? "",
      quartier: initial.quartier ?? "", adresse: initial.adresse ?? "",
      latitude: initial.latitude ?? null, longitude: initial.longitude ?? null,
    } : LOCALISATION_VIDE
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localisationValide, setLocalisationValide] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!localisation.departement) {
      setError("Veuillez sélectionner un département.");
      return;
    }
    if (!localisationValide) {
      setError("Corrigez la latitude/longitude avant de continuer.");
      return;
    }
    setLoading(true);
    try {
      const payload: PrestataireCreatePayload = {
        nom,
        type,
        departement: localisation.departement,
        commune: localisation.commune || null,
        arrondissement: localisation.arrondissement || null,
        quartier: localisation.quartier || null,
        adresse: localisation.adresse || null,
        latitude: localisation.latitude,
        longitude: localisation.longitude,
        telephone,
        email: email || null,
        horaires: horaires || null,
      };
      const result = initial
        ? await updatePrestataire(initial.id, payload)
        : await createPrestataire(payload);
      onSuccess(result);
    } catch (err) {
      setError((err as Error).message || "Une erreur est survenue.");
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
        className="w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
            {initial ? "Modifier le prestataire" : "Nouveau prestataire partenaire"}
          </h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container)]">
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-surface)" }}>close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl text-caption font-medium" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nom du prestataire" value={nom} onChange={(e) => setNom(e.target.value)} required />

          <div className="flex flex-col gap-1.5">
            <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
              Type de prestataire <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <div className="flex gap-3">
              {TYPE_PRESTATAIRE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer"
                  style={{
                    borderColor: type === opt ? "var(--color-primary)" : "var(--color-outline-variant)",
                    backgroundColor: type === opt ? "var(--color-primary-container)" : "var(--color-surface-container-lowest)",
                  }}
                >
                  <input
                    type="radio"
                    name="type-prestataire"
                    checked={type === opt}
                    onChange={() => setType(opt)}
                    className="w-4 h-4"
                  />
                  <span
                    className="text-body-md font-semibold"
                    style={{ color: type === opt ? "var(--color-on-primary-container)" : "var(--color-on-surface)" }}
                  >
                    {TYPE_LABELS[opt] ?? opt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+229 21 XX XX XX" required />
            <Input label="Email (optionnel)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <HorairesPicker value={horaires} onChange={setHoraires} />

          <LocalisationPicker
            value={localisation}
            onChange={(patch) => setLocalisation((prev) => ({ ...prev, ...patch }))}
            onValiditeChange={setLocalisationValide}
          />

          <div className="flex gap-3 pt-4">
            <Button variant="outline" fullWidth type="button" onClick={onCancel} disabled={loading}>Annuler</Button>
            <Button fullWidth type="submit" loading={loading} disabled={!localisationValide} icon={initial ? "save" : "add_business"}>
              {initial ? "Enregistrer" : "Créer le prestataire"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminPrestataires() {
  const [prestataires, setPrestataires] = useState<Prestataire[]>([]);
  const [laboratoiresAvecCompte, setLaboratoiresAvecCompte] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prestataire | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const askConfirmation = useConfirm();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prestatairesData, usersData] = await Promise.all([
        getPrestataires(),
        // Un échec ici ne doit pas bloquer l'affichage des prestataires — le
        // bouton "Créer un compte" resterait juste visible par défaut.
        getUsers().catch(() => []),
      ]);
      setPrestataires(prestatairesData);
      setLaboratoiresAvecCompte(new Set(
        usersData.filter((u) => u.role === "laboratoire" && u.prestataire_id).map((u) => u.prestataire_id!)
      ));
    } catch (err) {
      setError((err as Error).message || "Impossible de charger les prestataires.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (p: Prestataire) => {
    setPrestataires((prev) => [p, ...prev]);
    setShowForm(false);
    showToast(`"${p.nom}" créé avec succès.`);
  };

  const handleUpdated = (p: Prestataire) => {
    setPrestataires((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    setEditing(null);
    showToast(`"${p.nom}" mis à jour.`);
  };

  const handleToggleStatut = async (p: Prestataire) => {
    const action = p.statut === "actif" ? "désactiver" : "réactiver";
    const ok = await askConfirmation({
      title: p.statut === "actif" ? "Désactiver le prestataire" : "Réactiver le prestataire",
      message: `Voulez-vous ${action} "${p.nom}" ?`,
      confirmLabel: action === "désactiver" ? "Désactiver" : "Réactiver",
      variant: action === "désactiver" ? "danger" : "default",
    });
    if (!ok) return;
    try {
      if (p.statut === "actif") {
        await deactivatePrestataire(p.id);
      } else {
        await reactivatePrestataire(p.id);
      }
      setPrestataires((prev) => prev.map((x) => (x.id === p.id ? { ...x, statut: p.statut === "actif" ? "inactif" : "actif" } : x)));
      showToast(`"${p.nom}" ${p.statut === "actif" ? "désactivé" : "réactivé"}.`);
    } catch (err) {
      showToast((err as Error).message || "Erreur.", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl animate-slide-down text-body-md font-semibold"
          style={{ backgroundColor: toast.type === "success" ? "var(--color-success)" : "var(--color-error)", color: toast.type === "success" ? "var(--color-on-success)" : "var(--color-on-error)" }}>
          <span className="material-symbols-outlined filled text-[20px]">{toast.type === "success" ? "check_circle" : "error"}</span>
          {toast.message}
        </div>
      )}

      {(showForm || editing) && (
        <PrestataireForm
          initial={editing}
          onSuccess={editing ? handleUpdated : handleCreated}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>Pharmacies & Laboratoires</h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Pharmacies suggérées aux patients, laboratoires disponibles pour la prescription d'examens. {prestataires.length} enregistré{prestataires.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <Button icon="add_business" onClick={() => setShowForm(true)}>Ajouter un prestataire</Button>
      </div>

      <Card>
        <CardHeader icon="storefront" title="Liste des prestataires partenaires" />
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
            <button className="ml-auto underline text-body-md" onClick={load}>Réessayer</button>
          </div>
        ) : prestataires.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-5xl opacity-40">storefront</span>
            <p className="text-body-md">Aucun prestataire partenaire. Ajoutez-en un pour activer les suggestions et prescriptions d'examens.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {prestataires.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                <div className="min-w-0">
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {p.nom}
                    <span
                      className="text-caption font-semibold px-2 py-0.5 rounded-full ml-2"
                      style={{ backgroundColor: "var(--color-tertiary-container)", color: "var(--color-on-tertiary-container)" }}
                    >
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                  </p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {p.commune ?? p.departement} · {p.telephone}{p.latitude == null ? " · pas de position sur la carte" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-caption font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: p.statut === "actif" ? "var(--color-success-container)" : "var(--color-surface-container)",
                      color: p.statut === "actif" ? "var(--color-on-success-container)" : "var(--color-on-surface-variant)",
                    }}
                  >
                    {p.statut === "actif" ? "Actif" : "Inactif"}
                  </span>
                  {p.type === "laboratoire" && (
                    laboratoiresAvecCompte.has(p.id) ? (
                      <span
                        className="flex items-center gap-1 text-caption font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
                      >
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Compte créé
                      </span>
                    ) : (
                      <Link to={`/superadmin/utilisateurs?prestataire_id=${p.id}`}>
                        <Button variant="outline" size="sm" icon="person_add">Créer un compte</Button>
                      </Link>
                    )
                  )}
                  <Button variant="outline" size="sm" icon="edit" onClick={() => setEditing(p)}>Modifier</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={p.statut === "actif" ? "block" : "check_circle"}
                    onClick={() => handleToggleStatut(p)}
                  >
                    {p.statut === "actif" ? "Désactiver" : "Réactiver"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

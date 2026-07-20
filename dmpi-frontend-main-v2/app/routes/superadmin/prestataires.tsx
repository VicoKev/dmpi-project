// Gestion des prestataires partenaires (pharmacies, laboratoires) — Espace Super Admin National
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useListePaginee } from "../../hooks/useListePaginee";
import Card, { CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Modal, { ModalHeader } from "../../components/ui/Modal";
import Pagination from "../../components/ui/Pagination";
import LocalisationPicker, { type LocalisationValue } from "../../components/etablissement/LocalisationPicker";
import HorairesPicker from "../../components/ui/HorairesPicker";
import { validateTelephoneBenin, TELEPHONE_BENIN_HINT, TELEPHONE_BENIN_PLACEHOLDER } from "../../utils/telephone";
import {
  getPrestatairesPagine,
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
  departement: "", commune: "", arrondissement: "", quartier: "", adresse: "", latitude: null, longitude: null,
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
      departement: initial.departement,
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
    if (!localisation.departement || !localisation.commune || !localisation.arrondissement || !localisation.quartier) {
      setError("Veuillez sélectionner un département, une commune, un arrondissement et un quartier.");
      return;
    }
    if (!localisationValide) {
      setError("Corrigez la latitude/longitude avant de continuer.");
      return;
    }
    if (!validateTelephoneBenin(telephone)) {
      setError(TELEPHONE_BENIN_HINT);
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
    <Modal onClose={onCancel} labelledBy="prestataire-form-title" maxWidth="max-w-2xl" className="sm:p-8 max-h-[90vh] overflow-y-auto">
      <ModalHeader
        icon={initial ? "edit" : "add_business"}
        title={initial ? "Modifier le prestataire" : "Nouveau prestataire partenaire"}
        titleId="prestataire-form-title"
        onClose={onCancel}
      />

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
            <Input
              label="Téléphone"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder={TELEPHONE_BENIN_PLACEHOLDER}
              hint={TELEPHONE_BENIN_HINT}
              required
            />
            <Input label="Email (optionnel)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <HorairesPicker value={horaires} onChange={setHoraires} />

          <LocalisationPicker
            value={localisation}
            onChange={(patch) => setLocalisation((prev) => ({ ...prev, ...patch }))}
            territoireRequis
            onValiditeChange={setLocalisationValide}
          />

          <div className="flex gap-3 pt-4">
            <Button variant="outline" fullWidth type="button" onClick={onCancel} disabled={loading}>Annuler</Button>
            <Button fullWidth type="submit" loading={loading} disabled={!localisationValide} icon={initial ? "save" : "add_business"}>
              {initial ? "Enregistrer" : "Créer le prestataire"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}

const TAILLE_PAGE = 10;

export default function SuperAdminPrestataires() {
  const {
    items: prestataires,
    setItems: setPrestataires,
    total: totalItems,
    page,
    setPage,
    totalPages,
    loading,
    error,
    reload: load,
  } = useListePaginee<Prestataire>(
    (skip, limit) => getPrestatairesPagine(skip, limit),
    { taillePage: TAILLE_PAGE }
  );
  const [laboratoiresAvecCompte, setLaboratoiresAvecCompte] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Prestataire | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const askConfirmation = useConfirm();

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Un échec ici ne doit pas bloquer l'affichage des prestataires — le
    // bouton "Créer un compte" resterait juste visible par défaut.
    getUsers().then((usersData) => {
      setLaboratoiresAvecCompte(new Set(
        usersData.filter((u) => u.role === "laboratoire" && u.prestataire_id).map((u) => u.prestataire_id!)
      ));
    }).catch(() => {});
  }, []);

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
            Pharmacies suggérées aux patients, laboratoires disponibles pour la prescription d'examens. {totalItems ?? prestataires.length} enregistré{(totalItems ?? prestataires.length) !== 1 ? "s" : ""}.
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
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
        />
      </Card>
    </div>
  );
}

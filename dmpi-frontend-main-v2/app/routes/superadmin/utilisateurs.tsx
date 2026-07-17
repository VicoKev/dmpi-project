// Gestion des Utilisateurs — Espace Super Admin National
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import SelectRecherche from "../../components/ui/SelectRecherche";
import {
  getUsers,
  createUser,
  deactivateUser,
  reactivateUser,
  updateUser,
  ROLE_CONFIG,
  ROLE_LABELS,
  ROLES_SELECTABLE,
  DOMAINE_EMAIL_AUTORISE,
  estEmailDomaineValide,
  type User,
  type UserCreatePayload,
  type UserUpdatePayload,
} from "../../services/userService";
import { getEtablissements, type Etablissement } from "../../services/etablissementService";
import { getPrestataires, type Prestataire } from "../../services/prestataireService";
import { getDossierPatient } from "../../services/patientService";

// ─── Formulaire de création ──────────────────────────────────────────────────

interface CreateUserFormProps {
  onSuccess: (user: User) => void;
  onCancel: () => void;
  initialValues?: Partial<UserCreatePayload>;
}

function CreateUserForm({ onSuccess, onCancel, initialValues }: CreateUserFormProps) {
  const [form, setForm] = useState<UserCreatePayload>({
    email: "",
    mot_de_passe: "",
    nom: "",
    prenom: "",
    role: "medecin",
    specialite: "",
    service: "",
    npi_patient: null,
    etablissement_id: null,
    prestataire_id: null,
    date_naissance: null,
    sexe: "M",
    groupe_sanguin: null,
    ...initialValues,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [laboratoires, setLaboratoires] = useState<Prestataire[]>([]);

  useEffect(() => {
    getEtablissements().then(setEtablissements).catch(() => {});
    getPrestataires().then((liste) => setLaboratoires(liste.filter((p) => p.type === "laboratoire"))).catch(() => {});
  }, []);

  const update = (field: keyof UserCreatePayload, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Un laboratoire est une organisation, pas une personne — pas de prénom/nom
  // à saisir. On dérive ces deux champs (toujours requis en base) du
  // laboratoire choisi (prénom = son nom, nom = sa commune), plutôt que de
  // demander à l'admin d'inventer une identité.
  const laboratoireSelectionne = laboratoires.find((l) => l.id === form.prestataire_id);
  useEffect(() => {
    if (form.role !== "laboratoire") return;
    setForm((prev) => ({
      ...prev,
      prenom: laboratoireSelectionne?.nom ?? "",
      nom: laboratoireSelectionne?.commune ?? laboratoireSelectionne?.departement ?? "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.role, form.prestataire_id, laboratoireSelectionne?.nom, laboratoireSelectionne?.commune]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!estEmailDomaineValide(form.email)) {
      setError(`L'adresse email doit appartenir au domaine @${DOMAINE_EMAIL_AUTORISE}.`);
      return;
    }

    if (form.role === "patient" && (!form.npi_patient || form.npi_patient.length !== 10)) {
      setError("Le NPI du patient doit comporter exactement 10 chiffres.");
      return;
    }

    if (form.role === "patient" && (!form.date_naissance || !form.sexe)) {
      setError("La date de naissance et le sexe sont obligatoires pour un patient.");
      return;
    }

    if ((form.role === "medecin" || form.role === "infirmier" || form.role === "admin_etablissement") && !form.etablissement_id) {
      setError("Veuillez sélectionner un établissement pour ce rôle.");
      return;
    }

    if (form.role === "laboratoire" && !form.prestataire_id) {
      setError("Veuillez sélectionner le laboratoire de rattachement.");
      return;
    }

    setLoading(true);
    try {
      const payload: UserCreatePayload = {
        ...form,
        npi_patient: form.role === "patient" ? form.npi_patient : null,
        etablissement_id: (form.role === "medecin" || form.role === "infirmier" || form.role === "admin_etablissement") ? form.etablissement_id : null,
        prestataire_id: form.role === "laboratoire" ? form.prestataire_id : null,
        date_naissance: form.role === "patient" ? form.date_naissance : null,
        sexe: form.role === "patient" ? form.sexe : null,
        specialite: (form.role === "medecin" && form.specialite) ? form.specialite : null,
        service: ((form.role === "medecin" || form.role === "infirmier") && form.service) ? form.service : null,
      };
      const created = await createUser(payload);
      onSuccess(created);
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
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {/* En-tete modale */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--color-primary-container)" }}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ color: "var(--color-primary)" }}
              >
                person_add
              </span>
            </div>
            <div>
              <h2
                className="text-headline-sm font-bold"
                style={{ color: "var(--color-on-surface)" }}
              >
                Nouvel utilisateur
              </h2>
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                Compte configuré par le Super Admin
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-surface-container)]"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Erreur */}
        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl mb-4 text-body-md"
            style={{
              backgroundColor: "var(--color-error-container)",
              color: "var(--color-on-error-container)",
            }}
          >
            <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Identite — non pertinent pour un laboratoire (organisation, pas une personne) */}
          {form.role !== "laboratoire" && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                value={form.prenom}
                onChange={(e) => update("prenom", e.target.value)}
                leadingIcon="badge"
                required
              />
              <Input
                label="Nom"
                value={form.nom}
                onChange={(e) => update("nom", e.target.value)}
                required
              />
            </div>
          )}

          <Input
            label="Adresse email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            leadingIcon="mail"
            placeholder={`prenom.nom@${DOMAINE_EMAIL_AUTORISE}`}
            required
          />

          <Input
            label="Mot de passe initial"
            type="password"
            value={form.mot_de_passe}
            onChange={(e) => update("mot_de_passe", e.target.value)}
            leadingIcon="lock"
            required
          />

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-body-md font-semibold"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Role <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES_SELECTABLE.map((r) => {
                const cfg = ROLE_CONFIG[r.value];
                const selected = form.role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => update("role", r.value)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center"
                    style={{
                      borderColor: selected ? cfg.color : "var(--color-outline-variant)",
                      backgroundColor: selected ? cfg.bg : "transparent",
                    }}
                  >
                    <span
                      className="material-symbols-outlined filled text-[20px]"
                      style={{ color: cfg.color }}
                    >
                      {cfg.icon}
                    </span>
                    <span
                      className="text-caption font-semibold leading-tight"
                      style={{ color: selected ? cfg.color : "var(--color-on-surface-variant)" }}
                    >
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spécialité / Service conditionnel */}
          {(form.role === "medecin" || form.role === "infirmier") && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
              {form.role === "medecin" && (
                <Input
                  label="Spécialité (Optionnel)"
                  value={form.specialite ?? ""}
                  onChange={(e) => update("specialite", e.target.value)}
                  leadingIcon="stethoscope"
                  placeholder="Ex: Cardiologie"
                />
              )}
              <Input
                label="Service (Optionnel)"
                value={form.service ?? ""}
                onChange={(e) => update("service", e.target.value)}
                leadingIcon="domain"
                placeholder="Ex: Urgences"
              />
            </div>
          )}

          {/* NPI conditionnel */}
          {form.role === "patient" && (
            <div
              className="p-4 rounded-2xl border animate-fade-in-up"
              style={{
                borderColor: "var(--color-success)",
                backgroundColor: "var(--color-success-container)",
              }}
            >
              <p className="text-body-md font-semibold mb-2" style={{ color: "var(--color-on-success-container)" }}>
                Numéro Personnel d'Identification (NPI)
              </p>
              <Input
                label="NPI du patient (10 chiffres)"
                value={form.npi_patient ?? ""}
                onChange={(e) => update("npi_patient", e.target.value.replace(/\D/g, "").slice(0, 10))}
                leadingIcon="fingerprint"
                placeholder="Ex: 1234567890"
                required
              />
              <p className="text-caption mt-1.5" style={{ color: "var(--color-on-success-container)" }}>
                Le patient ne pourra consulter que son propre dossier via ce NPI.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <Input
                  label="Date de naissance"
                  type="date"
                  value={form.date_naissance ?? ""}
                  onChange={(e) => update("date_naissance", e.target.value)}
                  required
                />
                <div className="flex flex-col gap-1">
                  <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>
                    Sexe <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <select
                    value={form.sexe ?? "M"}
                    onChange={(e) => update("sexe", e.target.value)}
                    className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
                    style={{
                      borderColor: "var(--color-outline-variant)",
                      backgroundColor: "var(--color-surface-container-lowest)",
                      color: "var(--color-on-surface)",
                    }}
                    required
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <label className="text-label-bold" style={{ color: "var(--color-on-surface-variant)" }}>
                  Groupe sanguin
                </label>
                <select
                  value={form.groupe_sanguin ?? ""}
                  onChange={(e) => update("groupe_sanguin", e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2"
                  style={{
                    borderColor: "var(--color-outline-variant)",
                    backgroundColor: "var(--color-surface-container-lowest)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  <option value="">Non renseigné</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          )}

          {/* Établissement conditionnel */}
          {(form.role === "medecin" || form.role === "infirmier" || form.role === "admin_etablissement") && (
            <div
              className="p-4 rounded-2xl border animate-fade-in-up"
              style={{
                borderColor: "var(--color-primary)",
                backgroundColor: "var(--color-primary-container)",
              }}
            >
              <p className="text-body-md font-semibold mb-2" style={{ color: "var(--color-on-primary-container)" }}>
                Établissement de rattachement <span style={{ color: "var(--color-error)" }}>*</span>
              </p>
              {etablissements.length === 0 ? (
                <p className="text-caption" style={{ color: "var(--color-on-primary-container)" }}>
                  Aucun établissement disponible. Créez d'abord un établissement.
                </p>
              ) : (
                <SelectRecherche
                  value={form.etablissement_id ?? ""}
                  onChange={(v) => update("etablissement_id", v)}
                  options={etablissements.filter(e => e.statut === "actif").map(e => ({ value: e.id, label: e.nom, sousLabel: e.ville }))}
                  rechercherPlaceholder="Rechercher un établissement…"
                  ariaLabel="Établissement de rattachement"
                />
              )}
            </div>
          )}

          {/* Laboratoire conditionnel */}
          {form.role === "laboratoire" && (
            <div
              className="p-4 rounded-2xl border animate-fade-in-up"
              style={{
                borderColor: "#0891B2",
                backgroundColor: "#CFFAFE",
              }}
            >
              <p className="text-body-md font-semibold mb-2" style={{ color: "#0E7490" }}>
                Laboratoire de rattachement <span style={{ color: "var(--color-error)" }}>*</span>
              </p>
              {laboratoires.length === 0 ? (
                <p className="text-caption" style={{ color: "#0E7490" }}>
                  Aucun laboratoire enregistré. Créez d'abord un laboratoire dans "Pharmacies & Laboratoires".
                </p>
              ) : (
                <SelectRecherche
                  value={form.prestataire_id ?? ""}
                  onChange={(v) => update("prestataire_id", v)}
                  options={laboratoires.filter(l => l.statut === "actif").map(l => ({ value: l.id, label: l.nom, sousLabel: l.commune ?? l.departement }))}
                  rechercherPlaceholder="Rechercher un laboratoire…"
                  ariaLabel="Laboratoire de rattachement"
                />
              )}
              <p className="text-caption mt-1.5" style={{ color: "#0E7490" }}>
                Ce compte ne pourra voir et traiter que les demandes d'examen adressées à ce laboratoire.
                {laboratoireSelectionne && ` Identifié dans l'application comme « ${laboratoireSelectionne.nom} ${laboratoireSelectionne.commune ?? laboratoireSelectionne.departement} ».`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              type="button"
              onClick={onCancel}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button fullWidth type="submit" loading={loading} icon="person_add">
              Créer le compte
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Formulaire de modification ────────────────────────────────────────────────

interface EditUserFormProps {
  user: User;
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

function EditUserForm({ user, onSuccess, onCancel }: EditUserFormProps) {
  const [form, setForm] = useState<UserUpdatePayload>({
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
    npi_patient: user.npi_patient ?? "",
    prestataire_id: user.prestataire_id ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [laboratoires, setLaboratoires] = useState<Prestataire[]>([]);

  useEffect(() => {
    getPrestataires().then((liste) => setLaboratoires(liste.filter((p) => p.type === "laboratoire"))).catch(() => {});
  }, []);

  const update = (field: keyof UserUpdatePayload, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Comme à la création : un laboratoire est une organisation, pas une
  // personne — pas de prénom/nom à modifier manuellement, on les redérive
  // si l'admin change le laboratoire de rattachement (prénom = son nom,
  // nom = sa commune).
  const laboratoireSelectionne = laboratoires.find((l) => l.id === form.prestataire_id);
  useEffect(() => {
    if (form.role !== "laboratoire" || !laboratoireSelectionne) return;
    setForm((prev) => ({
      ...prev,
      prenom: laboratoireSelectionne.nom,
      nom: laboratoireSelectionne.commune ?? laboratoireSelectionne.departement,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.role, form.prestataire_id, laboratoireSelectionne?.nom, laboratoireSelectionne?.commune]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.email && !estEmailDomaineValide(form.email)) {
      setError(`L'adresse email doit appartenir au domaine @${DOMAINE_EMAIL_AUTORISE}.`);
      return;
    }

    if (form.role === "patient" && (!form.npi_patient || form.npi_patient.length !== 10)) {
      setError("Le NPI du patient doit comporter exactement 10 chiffres.");
      return;
    }

    if (form.role === "laboratoire" && !form.prestataire_id) {
      setError("Veuillez sélectionner le laboratoire de rattachement.");
      return;
    }

    setLoading(true);
    try {
      const payload: UserUpdatePayload = {
        ...form,
        npi_patient: form.role === "patient" ? form.npi_patient : null,
        prestataire_id: form.role === "laboratoire" ? form.prestataire_id : null,
      };
      const updated = await updateUser(user.id, payload);
      onSuccess(updated);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de la modification.");
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
        className="w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--color-primary-container)" }}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary)" }}>edit</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
                Modifier l'utilisateur
              </h2>
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                {user.email}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-surface-container)]"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-surface)" }}>close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl text-caption font-medium" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            value={form.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
            type="email"
            placeholder={`prenom.nom@${DOMAINE_EMAIL_AUTORISE}`}
            required
          />
          
          {form.role !== "laboratoire" && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Prénom" value={form.prenom ?? ""} onChange={(e) => update("prenom", e.target.value)} required />
              <Input label="Nom" value={form.nom ?? ""} onChange={(e) => update("nom", e.target.value)} required />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2"
            >
              {ROLES_SELECTABLE.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {form.role === "patient" && (
            <div className="flex flex-col gap-1.5 mt-2">
              <Input
                label="NPI du patient (10 chiffres)"
                value={form.npi_patient ?? ""}
                onChange={(e) => update("npi_patient", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Ex: 1234567890"
                required
              />
            </div>
          )}

          {form.role === "laboratoire" && (
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
                Laboratoire de rattachement <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <SelectRecherche
                value={form.prestataire_id ?? ""}
                onChange={(v) => update("prestataire_id", v)}
                options={laboratoires.filter(l => l.statut === "actif").map(l => ({ value: l.id, label: l.nom, sousLabel: l.commune ?? l.departement }))}
                rechercherPlaceholder="Rechercher un laboratoire…"
                ariaLabel="Laboratoire de rattachement"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2 mt-4">
            <Button variant="outline" fullWidth type="button" onClick={onCancel} disabled={loading}>Annuler</Button>
            <Button fullWidth type="submit" loading={loading} icon="save">Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function SuperAdminUtilisateurs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("tous");
  const [search, setSearch] = useState("");
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [reactivatingId, setReactivatingId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Pré-remplissage depuis une demande d'accès traitée (?npi=&nom=&prenom=)
  const npiPrefill = searchParams.get("npi");
  const [prefillDossier, setPrefillDossier] = useState<{
    dateNaissance: string | null;
    sexe: string;
    groupeSanguin: string | null;
  } | null>(null);

  // Pré-remplissage depuis "Créer un compte" sur une fiche laboratoire
  // (?prestataire_id=) — pas besoin de précharger quoi que ce soit, la
  // liste des laboratoires est déjà chargée par CreateUserForm lui-même.
  const prestataireIdPrefill = searchParams.get("prestataire_id");

  const createFormInitialValues = npiPrefill
    ? {
        role: "patient" as const,
        npi_patient: npiPrefill,
        nom: searchParams.get("nom") ?? "",
        prenom: searchParams.get("prenom") ?? "",
        date_naissance: prefillDossier?.dateNaissance ?? null,
        sexe: prefillDossier?.sexe ?? "M",
        groupe_sanguin: prefillDossier?.groupeSanguin ?? null,
      }
    : prestataireIdPrefill
    ? {
        role: "laboratoire" as const,
        prestataire_id: prestataireIdPrefill,
      }
    : undefined;

  useEffect(() => {
    if (!prestataireIdPrefill) return;
    setShowForm(true);
  }, [prestataireIdPrefill]);

  const clearPrefill = () => {
    if (npiPrefill) setPrefillDossier(null);
    if (npiPrefill || prestataireIdPrefill) setSearchParams({});
  };

  useEffect(() => {
    if (!npiPrefill) return;
    let cancelled = false;

    // Repart de zéro à chaque nouvelle demande traitée : une donnée d'un NPI
    // précédent ne doit jamais fuiter sur le formulaire du suivant.
    setPrefillDossier(null);

    getDossierPatient(npiPrefill)
      .then((dossier) => {
        if (cancelled) return;
        if (dossier) {
          setPrefillDossier({
            dateNaissance: dossier.patient.dateNaissance ? dossier.patient.dateNaissance.split("T")[0] : null,
            sexe: dossier.patient.sexe || "M",
            groupeSanguin: dossier.patient.groupeSanguin ?? null,
          });
        }
      })
      .catch(() => {
        // Le dossier n'a pas pu être préchargé : on ouvre quand même le formulaire
        // (npi/nom/prénom restent pré-remplis depuis l'URL) plutôt que de rester bloqué.
        if (!cancelled) {
          showToast("Impossible de précharger les données du dossier. Complétez-les manuellement.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setShowForm(true);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npiPrefill]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message || "Impossible de charger la liste des utilisateurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateSuccess = (newUser: User) => {
    setUsers((prev) => [newUser, ...prev]);
    setShowForm(false);
    clearPrefill();
    showToast(`Compte créé avec succès pour ${newUser.prenom} ${newUser.nom}.`);
  };

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Désactiver le compte de ${user.prenom} ${user.nom} ? Cette action est réversible.`)) return;
    setDeactivatingId(user.id);
    try {
      const updated = await deactivateUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(`Compte de ${user.prenom} ${user.nom} désactivé.`, "success");
    } catch (err) {
      showToast((err as Error).message || "Erreur lors de la désactivation.", "error");
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleReactivate = async (user: User) => {
    setReactivatingId(user.id);
    try {
      const updated = await reactivateUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(`Compte de ${user.prenom} ${user.nom} réactivé.`, "success");
    } catch (err) {
      showToast((err as Error).message || "Erreur lors de la réactivation.", "error");
    } finally {
      setReactivatingId(null);
    }
  };

  const handleEditSuccess = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    setEditingUser(null);
    showToast(`Informations mises à jour pour ${updatedUser.prenom} ${updatedUser.nom}.`);
  };

  const filtered = users.filter((u) => {
    const matchesRole = filterRole === "tous" || u.role === filterRole;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const counts: Record<string, number> = {
    tous: users.length,
    actifs: users.filter((u) => u.est_actif).length,
    ...Object.fromEntries(
      Object.keys(ROLE_CONFIG).map((r) => [r, users.filter((u) => u.role === r).length])
    ),
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl animate-slide-down text-body-md font-semibold"
          style={{
            backgroundColor: toast.type === "success" ? "var(--color-success)" : "var(--color-error)",
            color: toast.type === "success" ? "var(--color-on-success)" : "var(--color-on-error)",
          }}
        >
          <span className="material-symbols-outlined filled text-[20px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          {toast.message}
        </div>
      )}

      {/* Modal creation */}
      {showForm && (
        <CreateUserForm
          onSuccess={handleCreateSuccess}
          onCancel={() => {
            setShowForm(false);
            clearPrefill();
          }}
          initialValues={createFormInitialValues}
        />
      )}

      {/* Modal edition */}
      {editingUser && (
        <EditUserForm
          user={editingUser}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {/* En-tete */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
            Gestion des utilisateurs
          </h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            {counts.actifs} comptes actifs sur {counts.tous} au total dans le réseau DMPI.
          </p>
        </div>
        <Button icon="person_add" onClick={() => setShowForm(true)}>
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <button
            key={role}
            type="button"
            onClick={() => setFilterRole(filterRole === role ? "tous" : role)}
            className="flex flex-col gap-2 p-4 rounded-2xl text-left transition-all hover:scale-105"
            style={{
              backgroundColor: filterRole === role ? cfg.bg : "var(--color-surface-container-low)",
              outline: filterRole === role ? `2px solid ${cfg.color}` : "none",
            }}
          >
            <span
              className="material-symbols-outlined filled text-[22px]"
              style={{ color: cfg.color }}
            >
              {cfg.icon}
            </span>
            <p
              className="text-headline-sm font-bold"
              style={{ color: cfg.color }}
            >
              {counts[role] ?? 0}
            </p>
            <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
              {ROLE_LABELS[role]}
            </p>
          </button>
        ))}
      </div>

      {/* Tableau */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <CardHeader icon="manage_accounts" title="Répertoire des comptes" />
          <div className="sm:ml-auto">
            <Input
              label=""
              placeholder="Rechercher par nom, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leadingIcon="search"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl animate-pulse"
                style={{ backgroundColor: "var(--color-surface-container-low)" }}
              />
            ))}
          </div>
        ) : error ? (
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}
          >
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
            <button className="ml-auto underline text-body-md" onClick={loadUsers}>
              Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 py-12 text-center"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            <span className="material-symbols-outlined text-5xl opacity-40">person_search</span>
            <p className="text-body-md">Aucun utilisateur ne correspond à vos critères.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-body-md min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
                  {["Utilisateur", "Rôle", "Email", "NPI", "Statut", "Inscription", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-caption font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG["medecin"];
                  const isDeactivating = deactivatingId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className="border-b transition-colors hover:bg-[var(--color-surface-container-low)]"
                      style={{
                        borderColor: "var(--color-outline-variant)",
                        opacity: user.est_actif ? 1 : 0.5,
                      }}
                    >
                      {/* Nom */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: cfg.bg }}
                          >
                            <span
                              className="material-symbols-outlined filled text-[16px]"
                              style={{ color: cfg.color }}
                            >
                              {cfg.icon}
                            </span>
                          </div>
                          <p className="font-semibold" style={{ color: "var(--color-on-surface)" }}>
                            {user.prenom} {user.nom}
                          </p>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span
                          className="text-caption font-semibold px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}
                        >
                          {ROLE_LABELS[user.role] ?? user.role}
                        </span>
                      </td>

                      {/* Email */}
                      <td
                        className="px-4 py-3 text-caption"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {user.email}
                      </td>

                      {/* NPI */}
                      <td
                        className="px-4 py-3 text-caption font-mono"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {user.npi_patient ?? "—"}
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <span
                          className="text-caption font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit"
                          style={{
                            backgroundColor: user.est_actif
                              ? "var(--color-success-container)"
                              : "var(--color-surface-container)",
                            color: user.est_actif
                              ? "var(--color-success)"
                              : "var(--color-on-surface-variant)",
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: user.est_actif
                                ? "var(--color-success)"
                                : "var(--color-on-surface-variant)",
                            }}
                          />
                          {user.est_actif ? "Actif" : "Inactif"}
                        </span>
                      </td>

                      {/* Date creation */}
                      <td
                        className="px-4 py-3 text-caption"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        {new Date(user.date_creation).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="flex flex-col items-center justify-center p-2 rounded-xl transition-colors hover:bg-[var(--color-surface-container)]"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined text-[18px]" style={{ color: "var(--color-primary)" }}>edit</span>
                          </button>

                          {user.est_actif ? (
                            <button
                              onClick={() => handleDeactivate(user)}
                              disabled={isDeactivating}
                              className="flex items-center gap-1.5 text-caption font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80 disabled:opacity-40"
                              style={{
                                backgroundColor: "var(--color-error-container)",
                                color: "var(--color-on-error-container)",
                              }}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {isDeactivating ? "progress_activity" : "block"}
                              </span>
                              {isDeactivating ? "..." : "Désactiver"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(user)}
                              disabled={reactivatingId === user.id}
                              className="flex items-center gap-1.5 text-caption font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80 disabled:opacity-40"
                              style={{
                                backgroundColor: "var(--color-success-container)",
                                color: "var(--color-on-success-container)",
                              }}
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {reactivatingId === user.id ? "progress_activity" : "check_circle"}
                              </span>
                              {reactivatingId === user.id ? "..." : "Réactiver"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

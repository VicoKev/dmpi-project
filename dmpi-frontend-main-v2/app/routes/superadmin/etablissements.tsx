// Gestion des Etablissements — Espace Super Admin National (données réelles MongoDB)
import { useState, useEffect, useCallback } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import {
  getEtablissements,
  createEtablissement,
  updateEtablissement,
  deleteEtablissement,
  reactivateEtablissement,
  TYPE_OPTIONS,
  STATUT_OPTIONS,
  type Etablissement,
  type EtablissementCreatePayload,
  type EtablissementUpdatePayload,
} from "../../services/etablissementService";
import LocalisationPicker from "../../components/etablissement/LocalisationPicker";

// ─── Config UI ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  CHU:      { color: "var(--color-on-primary-container)",   bg: "var(--color-primary-container)",   icon: "local_hospital" },
  CHD:      { color: "var(--color-secondary)", bg: "var(--color-secondary-container)", icon: "emergency" },
  CSC:      { color: "var(--color-on-tertiary-container)",  bg: "var(--color-tertiary-container)",  icon: "home_health" },
  Clinique: { color: "var(--color-on-success-container)",   bg: "var(--color-success-container)",   icon: "healing" },
  Maternite:{ color: "#EC4899", bg: "#FCE7F3",                                         icon: "pediatrics" },
};

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; dot: boolean }> = {
  actif:       { label: "Actif",       color: "var(--color-on-success-container)", bg: "var(--color-success-container)", dot: true },
  maintenance: { label: "Maintenance", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)", dot: false },
  inactif:     { label: "Inactif",    color: "var(--color-error)",   bg: "var(--color-error-container)",   dot: false },
};

function ouTiret(valeur: string | null | undefined): string {
  return valeur && valeur.trim() ? valeur : "—";
}

function formatSync(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)} j`;
}

// ─── Formulaire création/édition ──────────────────────────────────────────────

const EMPTY_FORM: EtablissementCreatePayload = {
  nom: "", ville: "", departement: "", commune: "", arrondissement: "", quartier: "",
  adresse: "", latitude: null, longitude: null,
  type: "CHU", statut: "actif",
  telephone: "", dmpiVersion: "2.1.4",
  patients: 0, medecins: 0, infirmiers: 0, consultationsMois: 0,
};

interface EtablissementFormProps {
  initial?: Etablissement | null;
  onSuccess: (e: Etablissement) => void;
  onCancel: () => void;
}

function EtablissementForm({ initial, onSuccess, onCancel }: EtablissementFormProps) {
  const [form, setForm] = useState<EtablissementCreatePayload>(
    initial ? {
      nom: initial.nom, ville: initial.ville, departement: initial.departement,
      commune: initial.commune ?? "", arrondissement: initial.arrondissement ?? "", quartier: initial.quartier ?? "",
      adresse: initial.adresse ?? "", latitude: initial.latitude ?? null, longitude: initial.longitude ?? null,
      type: initial.type, statut: initial.statut,
      telephone: initial.telephone, dmpiVersion: initial.dmpiVersion,
      patients: initial.patients, medecins: initial.medecins,
      infirmiers: initial.infirmiers, consultationsMois: initial.consultationsMois,
    } : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localisationValide, setLocalisationValide] = useState(true);

  const update = (field: keyof EtablissementCreatePayload, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const updateLocalisation = (patch: Partial<EtablissementCreatePayload>) =>
    setForm(prev => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.departement || !form.commune || !form.arrondissement || !form.quartier) {
      setError("Veuillez sélectionner un département, une commune, un arrondissement et un quartier.");
      return;
    }
    if (!localisationValide) {
      setError("Corrigez la latitude/longitude avant de continuer.");
      return;
    }
    setLoading(true);
    try {
      let result: Etablissement;
      if (initial) {
        result = await updateEtablissement(initial.id, form as EtablissementUpdatePayload);
      } else {
        result = await createEtablissement(form);
      }
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-primary-container)" }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-on-primary-container)" }}>
                {initial ? "edit" : "add_business"}
              </span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>
                {initial ? "Modifier l'établissement" : "Nouvel établissement"}
              </h2>
              <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                {initial ? initial.nom : "Ajouter au réseau DMPI Bénin"}
              </p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nom de l'établissement" value={form.nom} onChange={e => update("nom", e.target.value)} required />

          <Input label="Ville" value={form.ville} onChange={e => update("ville", e.target.value)} required />

          <LocalisationPicker
            value={{
              ville: form.ville,
              departement: form.departement,
              commune: form.commune ?? "",
              arrondissement: form.arrondissement ?? "",
              quartier: form.quartier ?? "",
              adresse: form.adresse ?? "",
              latitude: form.latitude ?? null,
              longitude: form.longitude ?? null,
            }}
            onChange={updateLocalisation}
            territoireRequis
            onValiditeChange={setLocalisationValide}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Type</label>
              <select value={form.type} onChange={e => update("type", e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none">
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Statut</label>
              <select value={form.statut} onChange={e => update("statut", e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none">
                {STATUT_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Input label="Téléphone" value={form.telephone} onChange={e => update("telephone", e.target.value)} placeholder="+229 21 XX XX XX" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" fullWidth type="button" onClick={onCancel} disabled={loading}>Annuler</Button>
            <Button fullWidth type="submit" loading={loading} disabled={!localisationValide} icon={initial ? "save" : "add_business"}>
              {initial ? "Enregistrer" : "Créer l'établissement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function SuperAdminEtablissements() {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("tous");
  const [filterStatut, setFilterStatut] = useState<string>("tous");
  const [selected, setSelected] = useState<Etablissement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEtab, setEditingEtab] = useState<Etablissement | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadEtablissements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEtablissements();
      setEtablissements(data);
    } catch (err) {
      setError((err as Error).message || "Impossible de charger les établissements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEtablissements(); }, [loadEtablissements]);

  const handleCreate = (created: Etablissement) => {
    setEtablissements(prev => [created, ...prev]);
    setShowForm(false);
    showToast(`Établissement "${created.nom}" créé avec succès.`);
  };

  const handleEdit = (updated: Etablissement) => {
    setEtablissements(prev => prev.map(e => e.id === updated.id ? updated : e));
    setEditingEtab(null);
    setSelected(null);
    showToast(`Établissement "${updated.nom}" mis à jour.`);
  };

  const handleDelete = async (etab: Etablissement) => {
    if (!confirm(`Désactiver l'établissement "${etab.nom}" ?`)) return;
    try {
      await deleteEtablissement(etab.id);
      setEtablissements(prev => prev.map(e => e.id === etab.id ? { ...e, statut: "inactif" } : e));
      setSelected(null);
      showToast(`"${etab.nom}" désactivé.`);
    } catch (err) {
      showToast((err as Error).message || "Erreur lors de la désactivation.", "error");
    }
  };

  const handleReactivate = async (etab: Etablissement) => {
    if (!confirm(`Réactiver l'établissement "${etab.nom}" ?`)) return;
    try {
      await reactivateEtablissement(etab.id);
      setEtablissements(prev => prev.map(e => e.id === etab.id ? { ...e, statut: "actif" } : e));
      setSelected(null);
      showToast(`"${etab.nom}" réactivé avec succès.`);
    } catch (err) {
      showToast((err as Error).message || "Erreur lors de la réactivation.", "error");
    }
  };

  const filtered = etablissements.filter(e => {
    const matchType = filterType === "tous" || e.type === filterType;
    const matchStatut = filterStatut === "tous" || e.statut === filterStatut;
    const q = search.toLowerCase();
    const matchSearch = !q || e.nom.toLowerCase().includes(q) || e.ville.toLowerCase().includes(q) || e.departement.toLowerCase().includes(q) || (e.directeur ?? "").toLowerCase().includes(q);
    return matchType && matchStatut && matchSearch;
  });

  const totaux = {
    actifs: etablissements.filter(e => e.statut === "actif").length,
    patients: etablissements.reduce((s, e) => s + e.patients, 0),
    medecins: etablissements.reduce((s, e) => s + e.medecins, 0),
    infirmiers: etablissements.reduce((s, e) => s + e.infirmiers, 0),
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl animate-slide-down text-body-md font-semibold"
          style={{ backgroundColor: toast.type === "success" ? "var(--color-success)" : "var(--color-error)", color: toast.type === "success" ? "var(--color-on-success)" : "var(--color-on-error)" }}>
          <span className="material-symbols-outlined filled text-[20px]">{toast.type === "success" ? "check_circle" : "error"}</span>
          {toast.message}
        </div>
      )}

      {/* Modal detail */}
      {selected && !editingEtab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-slide-down max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--color-surface)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: TYPE_CONFIG[selected.type]?.bg }}>
                  <span className="material-symbols-outlined filled text-[24px]" style={{ color: TYPE_CONFIG[selected.type]?.color }}>{TYPE_CONFIG[selected.type]?.icon}</span>
                </div>
                <div>
                  <h2 className="text-headline-sm font-bold" style={{ color: "var(--color-on-surface)" }}>{selected.nom}</h2>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{selected.ville} · {selected.departement} · v{selected.dmpiVersion}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container)]" style={{ color: "var(--color-on-surface-variant)" }}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {[
                { icon: "group", label: "Patients", value: selected.patients.toLocaleString("fr-FR") },
                { icon: "stethoscope", label: "Médecins", value: selected.medecins },
                { icon: "vaccines", label: "Infirmiers", value: selected.infirmiers },
                { icon: "medical_services", label: "Consult./mois", value: selected.consultationsMois.toLocaleString("fr-FR") },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                  <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary)" }}>{s.icon}</span>
                  <div>
                    <p className="text-body-md font-bold" style={{ color: "var(--color-on-surface)" }}>{s.value}</p>
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-body-md mb-5" style={{ color: "var(--color-on-surface-variant)" }}>
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">person</span><span>Directeur : <strong style={{ color: "var(--color-on-surface)" }}>{ouTiret(selected.directeur)}</strong></span></div>
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">call</span><span>{ouTiret(selected.telephone)}</span></div>
              {(selected.commune || selected.arrondissement || selected.quartier || selected.adresse) && (
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span>
                  <span>
                    {[selected.quartier, selected.arrondissement, selected.commune].filter(Boolean).join(", ")}
                    {selected.adresse ? ` — ${selected.adresse}` : ""}
                    {selected.latitude != null && selected.longitude != null && (
                      <span className="text-caption block">
                        ({selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)})
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">sync</span><span>Sync : <strong style={{ color: "var(--color-on-surface)" }}>{formatSync(selected.derniereSync)}</strong></span></div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth icon="edit" onClick={() => setEditingEtab(selected)}>Modifier</Button>
              {selected.statut === "inactif" ? (
                <Button fullWidth icon="check_circle" onClick={() => handleReactivate(selected)} style={{ backgroundColor: "var(--color-success-container)", color: "var(--color-on-success-container)" }}>Réactiver</Button>
              ) : (
                <Button fullWidth icon="block" onClick={() => handleDelete(selected)} style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>Désactiver</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal formulaire */}
      {(showForm || editingEtab) && (
        <EtablissementForm
          initial={editingEtab}
          onSuccess={editingEtab ? handleEdit : handleCreate}
          onCancel={() => { setShowForm(false); setEditingEtab(null); }}
        />
      )}

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>Établissements de santé</h1>
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            {loading ? "Chargement..." : `${totaux.actifs} actifs sur ${etablissements.length} dans le réseau DMPI Bénin.`}
          </p>
        </div>
        <Button icon="add_business" onClick={() => setShowForm(true)}>Ajouter un établissement</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: "domain",      label: "Établissements actifs",    value: `${totaux.actifs}/${etablissements.length}`, color: "var(--color-primary)" },
          { icon: "group",       label: "Patients enregistrés",     value: totaux.patients.toLocaleString("fr-FR"),      color: "var(--color-secondary)" },
          { icon: "stethoscope", label: "Médecins",                  value: totaux.medecins,                              color: "var(--color-tertiary)" },
          { icon: "vaccines",    label: "Infirmiers",                value: totaux.infirmiers,                            color: "var(--color-on-success-container)" },
        ].map(s => (
          <div key={s.label} className="flex flex-col gap-2 p-4 rounded-2xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
            <span className="material-symbols-outlined filled text-[22px]" style={{ color: s.color }}>{s.icon}</span>
            <p className="text-headline-sm font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input label="" placeholder="Rechercher par nom, ville, directeur..." value={search} onChange={e => setSearch(e.target.value)} leadingIcon="search" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["tous", "actif", "maintenance", "inactif"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatut(s)} className="px-4 py-2 rounded-xl text-body-md font-semibold transition-all capitalize"
              style={filterStatut === s ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" } : { backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}>
              {s === "tous" ? "Tous" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterType("tous")} className="px-3 py-1.5 rounded-xl text-caption font-semibold transition-all"
          style={filterType === "tous" ? { backgroundColor: "var(--color-primary)", color: "var(--color-on-primary)" } : { backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}>
          Tous les types
        </button>
        {Object.entries(TYPE_CONFIG).map(([t, cfg]) => (
          <button key={t} onClick={() => setFilterType(filterType === t ? "tous" : t)} className="px-3 py-1.5 rounded-xl text-caption font-semibold transition-all flex items-center gap-1.5"
            style={filterType === t ? { backgroundColor: cfg.color, color: "#fff" } : { backgroundColor: cfg.bg, color: cfg.color }}>
            <span className="material-symbols-outlined filled text-[14px]">{cfg.icon}</span>{t}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader icon="domain" title={`Réseau DMPI (${filtered.length} établissements)`} />
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
            <button className="ml-auto underline" onClick={loadEtablissements}>Réessayer</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
            <span className="material-symbols-outlined text-5xl opacity-40">domain_disabled</span>
            <p className="text-body-md">Aucun établissement trouvé. Créez le premier !</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-body-md min-w-[900px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
                  {["Établissement", "Type", "Effectifs", "Consult./mois", "Statut", "Sync", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-caption font-semibold uppercase tracking-wider" style={{ color: "var(--color-on-surface-variant)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const typeCfg = TYPE_CONFIG[e.type] ?? TYPE_CONFIG["CHU"];
                  const statutCfg = STATUT_CONFIG[e.statut] ?? STATUT_CONFIG["inactif"];
                  return (
                    <tr key={e.id} className="border-b transition-colors hover:bg-[var(--color-surface-container-low)]" style={{ borderColor: "var(--color-outline-variant)" }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold" style={{ color: "var(--color-on-surface)" }}>{e.nom}</p>
                        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{e.ville} · {e.departement}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-caption font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit" style={{ backgroundColor: typeCfg.bg, color: typeCfg.color }}>
                          <span className="material-symbols-outlined filled text-[12px]">{typeCfg.icon}</span>{e.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">stethoscope</span>{e.medecins}</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">vaccines</span>{e.infirmiers}</span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-on-surface-variant)" }}>{e.consultationsMois > 0 ? e.consultationsMois.toLocaleString("fr-FR") : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-caption font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit" style={{ backgroundColor: statutCfg.bg, color: statutCfg.color }}>
                          {statutCfg.dot && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: statutCfg.color }} />}
                          {statutCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{formatSync(e.derniereSync)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelected(e)} className="flex items-center gap-1 text-caption font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                          style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-primary)" }}>
                          <span className="material-symbols-outlined text-[14px]">info</span>Détails
                        </button>
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

// Mon établissement — Espace Admin Établissement
import { useEffect, useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import LocalisationPicker, { type LocalisationValue } from "../../components/etablissement/LocalisationPicker";
import { getMonEtablissement, updateMonEtablissement, type Etablissement } from "../../services/etablissementService";

const TYPE_LABELS: Record<string, string> = {
  CHU: "Centre Hospitalier Universitaire",
  CHD: "Centre Hospitalier Départemental",
  CSC: "Centre de Santé de Commune",
  Clinique: "Clinique",
  Maternite: "Maternité",
};

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  actif: { label: "Actif", color: "var(--color-on-success-container)", bg: "var(--color-success-container)" },
  maintenance: { label: "Maintenance", color: "var(--color-on-warning-container)", bg: "var(--color-warning-container)" },
  inactif: { label: "Inactif", color: "var(--color-error)", bg: "var(--color-error-container)" },
};

const LOCALISATION_VIDE: LocalisationValue = {
  departement: "", commune: "", arrondissement: "", quartier: "", adresse: "", latitude: null, longitude: null,
};

export default function AdminMonEtablissement() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [localisation, setLocalisation] = useState<LocalisationValue>(LOCALISATION_VIDE);
  const [telephone, setTelephone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSucces, setSaveSucces] = useState(false);
  const [localisationValide, setLocalisationValide] = useState(true);

  const charger = () => {
    setLoading(true);
    getMonEtablissement()
      .then((e) => {
        setEtablissement(e);
        setLocalisation({
          departement: e.departement,
          commune: e.commune ?? "",
          arrondissement: e.arrondissement ?? "",
          quartier: e.quartier ?? "",
          adresse: e.adresse ?? "",
          latitude: e.latitude ?? null,
          longitude: e.longitude ?? null,
        });
        setTelephone(e.telephone);
      })
      .catch((err) => setError((err as Error).message || "Impossible de charger votre établissement."))
      .finally(() => setLoading(false));
  };

  useEffect(charger, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSucces(false);
    if (!localisation.departement || !localisation.commune || !localisation.arrondissement || !localisation.quartier) {
      setSaveError("Veuillez sélectionner un département, une commune, un arrondissement et un quartier.");
      return;
    }
    if (!localisationValide) {
      setSaveError("Corrigez la latitude/longitude avant de continuer.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMonEtablissement({
        departement: localisation.departement,
        commune: localisation.commune,
        arrondissement: localisation.arrondissement,
        quartier: localisation.quartier,
        adresse: localisation.adresse,
        latitude: localisation.latitude,
        longitude: localisation.longitude,
        telephone,
      });
      setEtablissement(updated);
      setSaveSucces(true);
      setTimeout(() => setSaveSucces(false), 4000);
    } catch (err) {
      setSaveError((err as Error).message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mon établissement
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Coordonnées et localisation — le nom, le type et le statut de l'établissement sont gérés par le Super Administrateur national.
        </p>
      </div>

      {loading ? (
        <div className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container)" }} />
      ) : error ? (
        <div className="p-4 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
          {error}
        </div>
      ) : etablissement ? (
        <>
          {/* Identité (lecture seule) */}
          <Card>
            <CardHeader icon="domain" title={etablissement.nom} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Type</p>
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{TYPE_LABELS[etablissement.type] ?? etablissement.type}</p>
              </div>
              <div>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Statut</p>
                <span
                  className="text-caption font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5"
                  style={{ backgroundColor: STATUT_CONFIG[etablissement.statut]?.bg, color: STATUT_CONFIG[etablissement.statut]?.color }}
                >
                  {STATUT_CONFIG[etablissement.statut]?.label ?? etablissement.statut}
                </span>
              </div>
              <div>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Directeur</p>
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{etablissement.directeur ?? "—"}</p>
              </div>
              <div>
                <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>Version DMPI</p>
                <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{etablissement.dmpiVersion}</p>
              </div>
            </div>
          </Card>

          {/* Coordonnées et localisation (éditables) */}
          <Card>
            <CardHeader icon="edit_location" title="Coordonnées et localisation" />
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {saveError && (
                <div className="p-3 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
                  {saveError}
                </div>
              )}
              {saveSucces && (
                <div className="p-3 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-success-container)", color: "var(--color-on-success-container)" }}>
                  Établissement mis à jour avec succès.
                </div>
              )}

              <Input label="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+229 21 XX XX XX" />

              <LocalisationPicker
                value={localisation}
                onChange={(patch) => setLocalisation((prev) => ({ ...prev, ...patch }))}
                territoireRequis
                onValiditeChange={setLocalisationValide}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" icon="save" loading={saving} disabled={!localisationValide}>Enregistrer</Button>
              </div>
            </form>
          </Card>
        </>
      ) : null}
    </div>
  );
}

// Carte Carnet de vaccination
import { useState } from "react";
import Card, { CardHeader } from "../ui/Card";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import { formatDateFr } from "../../services/patientService";
import type { Vaccination } from "../../types/patient";
import type { AjouterVaccinationPayload } from "../../services/patientService";

// Vaccins du Programme Élargi de Vaccination (PEV) du Bénin, complétés de
// quelques vaccins courants hors PEV — liste fermée pour éviter les fautes
// de frappe, avec une échappatoire "Autre" pour les cas non couverts.
const VACCINS_COURANTS = [
  "BCG (tuberculose)",
  "Polio (VPO/VPI)",
  "Pentavalent (DTC-HepB-Hib)",
  "Pneumocoque (PCV)",
  "Rotavirus",
  "Rougeole-Rubéole (VAR)",
  "Fièvre jaune",
  "Méningite A (MenA)",
  "Tétanos (VAT)",
  "Hépatite B",
  "Fièvre typhoïde",
  "Choléra",
  "Papillomavirus (HPV)",
  "COVID-19",
];
const AUTRE_VACCIN = "Autre";

const VACCIN_VIDE = { nomVaccin: "", nomVaccinAutre: "", dateAdministration: "", dose: "", lot: "", prochaineDosePrevue: "", notes: "" };

export default function VaccinationsCard({
  vaccinations,
  onAjouter,
  titre = "Carnet de vaccination",
}: {
  vaccinations: Vaccination[];
  /** Fourni uniquement côté médecin/infirmier — le patient consulte en lecture seule. */
  onAjouter?: (payload: AjouterVaccinationPayload) => Promise<void> | void;
  titre?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(VACCIN_VIDE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof typeof VACCIN_VIDE, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const trie = [...vaccinations].sort((a, b) => b.dateAdministration.localeCompare(a.dateAdministration));
  const aujourdHui = new Date().toISOString().split("T")[0];
  const rappelsAVenir = vaccinations.filter((v) => v.prochaineDosePrevue && v.prochaineDosePrevue >= aujourdHui);

  const handleAjouter = async () => {
    if (!onAjouter) return;
    setError(null);
    const nomVaccinFinal = form.nomVaccin === AUTRE_VACCIN ? form.nomVaccinAutre.trim() : form.nomVaccin;
    if (!nomVaccinFinal || !form.dateAdministration) {
      setError("Le vaccin et la date d'administration sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      await onAjouter({
        nom_vaccin: nomVaccinFinal,
        date_administration: form.dateAdministration,
        dose: form.dose.trim() || undefined,
        lot: form.lot.trim() || undefined,
        prochaine_dose_prevue: form.prochaineDosePrevue || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm(VACCIN_VIDE);
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message || "Erreur lors de l'ajout de la vaccination.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 mb-2">
        <CardHeader icon="vaccines" title={titre} />
        {onAjouter && !showForm && (
          <Button variant="outline" size="sm" icon="add" onClick={() => setShowForm(true)}>
            Ajouter
          </Button>
        )}
      </div>

      {rappelsAVenir.length > 0 && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl mb-3 text-body-md"
          style={{ backgroundColor: "var(--color-warning-container)", color: "var(--color-on-warning-container)" }}
        >
          <span className="material-symbols-outlined text-[18px] mt-0.5">event_upcoming</span>
          <span>
            {rappelsAVenir.length} rappel{rappelsAVenir.length > 1 ? "s" : ""} de vaccination à prévoir
            {" — prochain le "}
            {formatDateFr([...rappelsAVenir].sort((a, b) => (a.prochaineDosePrevue ?? "").localeCompare(b.prochaineDosePrevue ?? ""))[0].prochaineDosePrevue!)}
          </span>
        </div>
      )}

      {showForm && (
        <div className="flex flex-col gap-3 p-3 mb-3 rounded-xl border" style={{ borderColor: "var(--color-outline-variant)" }}>
          {error && (
            <div className="p-2 rounded-lg text-caption" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Vaccin"
              value={form.nomVaccin}
              onChange={(e) => update("nomVaccin", e.target.value)}
              required
              options={[
                { value: "", label: "Sélectionner…", disabled: true },
                ...VACCINS_COURANTS.map((v) => ({ value: v, label: v })),
                { value: AUTRE_VACCIN, label: "Autre (préciser)" },
              ]}
            />
            <Input label="Date d'administration" type="date" value={form.dateAdministration} onChange={(e) => update("dateAdministration", e.target.value)} required />
            {form.nomVaccin === AUTRE_VACCIN && (
              <Input
                label="Préciser le vaccin"
                value={form.nomVaccinAutre}
                onChange={(e) => update("nomVaccinAutre", e.target.value)}
                placeholder="Nom du vaccin"
                required
                className="sm:col-span-2"
              />
            )}
            <Input label="Dose (optionnel)" value={form.dose} onChange={(e) => update("dose", e.target.value)} placeholder="Ex: 1ère dose, rappel" />
            <Input label="N° de lot (optionnel)" value={form.lot} onChange={(e) => update("lot", e.target.value)} />
            <Input label="Prochaine dose prévue (optionnel)" type="date" value={form.prochaineDosePrevue} onChange={(e) => update("prochaineDosePrevue", e.target.value)} />
          </div>
          <Textarea placeholder="Notes (optionnel)…" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => { setShowForm(false); setForm(VACCIN_VIDE); setError(null); }}>
              Annuler
            </Button>
            <Button size="sm" icon="vaccines" loading={saving} onClick={handleAjouter}>
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {trie.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucune vaccination enregistrée.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {trie.map((v, i) => {
            const rappelAVenir = v.prochaineDosePrevue && v.prochaineDosePrevue >= aujourdHui;
            return (
              <li key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                <div className="min-w-0">
                  <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                    {v.nomVaccin}{v.dose ? ` — ${v.dose}` : ""}
                  </p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                    {formatDateFr(v.dateAdministration)}
                    {v.lot ? ` · Lot ${v.lot}` : ""}
                    {v.administrePar ? ` · Par ${v.administrePar}` : ""}
                  </p>
                  {v.notes && (
                    <p className="text-caption mt-1 italic" style={{ color: "var(--color-on-surface-variant)" }}>{v.notes}</p>
                  )}
                </div>
                {rappelAVenir && (
                  <Badge variant="warning" size="sm">Rappel le {formatDateFr(v.prochaineDosePrevue!)}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

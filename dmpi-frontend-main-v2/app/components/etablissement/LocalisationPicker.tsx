import { useEffect, useMemo, useState } from "react";
import Input from "../ui/Input";
import SelectRecherche from "../ui/SelectRecherche";
import CarteEtablissementLazy from "./CarteEtablissementLazy";
import {
  getDepartements,
  getCommunes,
  getArrondissements,
  getQuartiers,
  type Departement,
  type Commune,
  type Arrondissement,
  type Quartier,
} from "../../services/territoireService";

export interface LocalisationValue {
  ville: string;
  departement: string;
  commune: string;
  arrondissement: string;
  quartier: string;
  adresse: string;
  latitude: number | null;
  longitude: number | null;
}

interface LocalisationPickerProps {
  value: LocalisationValue;
  onChange: (patch: Partial<LocalisationValue>) => void;
  /** Affiche département/commune/arrondissement/quartier comme requis (astérisque). */
  territoireRequis?: boolean;
  /** Notifie le parent si les champs latitude/longitude sont dans un état
   * saisissable mais non exploitable (texte non numérique) — pour bloquer la
   * soumission plutôt que de silencieusement garder l'ancienne valeur. */
  onValiditeChange?: (valide: boolean) => void;
}

function LabelChamp({ children, requis }: { children: string; requis: boolean }) {
  return (
    <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
      {children}
      {requis && <span className="ml-0.5" style={{ color: "var(--color-error)" }}>*</span>}
    </label>
  );
}

/**
 * Texte de saisie libre pour un champ numérique, synchronisé avec une valeur
 * `number | null` détenue par le parent. Ne réécrase le texte local que
 * lorsque la valeur externe diverge de ce que l'utilisateur est en train de
 * taper (ex : clic sur la carte) — sinon un "6." ou "6.30" en cours de
 * saisie serait reformaté à chaque frappe et empêcherait de taper la suite.
 */
function useSaisieNombre(valeur: number | null, onCommit: (n: number | null) => void) {
  const [texte, setTexte] = useState(valeur != null ? String(valeur) : "");

  useEffect(() => {
    const parsed = texte.trim() === "" ? null : Number(texte);
    const parsedValide = parsed !== null && !Number.isNaN(parsed);
    if ((parsedValide ? parsed : null) !== valeur) {
      setTexte(valeur != null ? String(valeur) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur]);

  const gererChangement = (brut: string) => {
    setTexte(brut);
    const trimmed = brut.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) {
      onCommit(parsed);
    }
  };

  return [texte, gererChangement] as const;
}

export default function LocalisationPicker({ value, onChange, territoireRequis = false, onValiditeChange }: LocalisationPickerProps) {
  const [departements, setDepartements] = useState<Departement[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [arrondissements, setArrondissements] = useState<Arrondissement[]>([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);

  useEffect(() => {
    getDepartements().then(setDepartements).catch(() => setDepartements([]));
  }, []);

  const departementSel = departements.find(d => d.lib_dep === value.departement) ?? null;
  const communeSel = communes.find(c => c.lib_com === value.commune) ?? null;
  const arrondissementSel = arrondissements.find(a => a.lib_arrond === value.arrondissement) ?? null;

  useEffect(() => {
    if (!departementSel) {
      setCommunes([]);
      return;
    }
    getCommunes(departementSel.id_dep).then(setCommunes).catch(() => setCommunes([]));
  }, [departementSel?.id_dep]);

  useEffect(() => {
    if (!communeSel) {
      setArrondissements([]);
      return;
    }
    getArrondissements(communeSel.id_com).then(setArrondissements).catch(() => setArrondissements([]));
  }, [communeSel?.id_com]);

  useEffect(() => {
    if (!arrondissementSel) {
      setQuartiers([]);
      return;
    }
    getQuartiers(arrondissementSel.id_arrond).then(setQuartiers).catch(() => setQuartiers([]));
  }, [arrondissementSel?.id_arrond]);

  const handleDepartementChange = (lib_dep: string) => {
    onChange({ departement: lib_dep, commune: "", arrondissement: "", quartier: "" });
  };

  const handleCommuneChange = (lib_com: string) => {
    onChange({ commune: lib_com, arrondissement: "", quartier: "" });
  };

  const handleArrondissementChange = (lib_arrond: string) => {
    onChange({ arrondissement: lib_arrond, quartier: "" });
  };

  const [latText, handleLatChange] = useSaisieNombre(value.latitude, (lat) => onChange({ latitude: lat }));
  const [lngText, handleLngChange] = useSaisieNombre(value.longitude, (lng) => onChange({ longitude: lng }));

  // Texte présent mais non numérique : useSaisieNombre n'a alors rien commité
  // au parent (l'ancienne valeur, ou null, est restée) — sans ce contrôle,
  // le formulaire pourrait être soumis avec une coordonnée jamais réellement
  // saisie, sans que l'utilisateur s'en rende compte.
  const latTexteInvalide = latText.trim() !== "" && Number.isNaN(Number(latText.trim()));
  const lngTexteInvalide = lngText.trim() !== "" && Number.isNaN(Number(lngText.trim()));
  const latHorsPlage = value.latitude != null && (value.latitude < -90 || value.latitude > 90);
  const lngHorsPlage = value.longitude != null && (value.longitude < -180 || value.longitude > 180);

  const localisationValide = !latTexteInvalide && !lngTexteInvalide;
  useEffect(() => {
    onValiditeChange?.(localisationValide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localisationValide]);

  const latErreur = latTexteInvalide ? "Doit être un nombre." : latHorsPlage ? "Doit être comprise entre -90 et 90." : undefined;
  const lngErreur = lngTexteInvalide ? "Doit être un nombre." : lngHorsPlage ? "Doit être comprise entre -180 et 180." : undefined;

  const optionsDepartements = useMemo(() => departements.map(d => ({ value: d.lib_dep, label: d.lib_dep })), [departements]);
  const optionsCommunes = useMemo(() => communes.map(c => ({ value: c.lib_com, label: c.lib_com })), [communes]);
  const optionsArrondissements = useMemo(() => arrondissements.map(a => ({ value: a.lib_arrond, label: a.lib_arrond })), [arrondissements]);
  const optionsQuartiers = useMemo(() => quartiers.map(q => ({ value: q.lib_quart, label: q.lib_quart })), [quartiers]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <LabelChamp requis={territoireRequis}>Département</LabelChamp>
          <SelectRecherche
            value={value.departement}
            onChange={handleDepartementChange}
            options={optionsDepartements}
            rechercherPlaceholder="Rechercher un département…"
            ariaLabel="Département"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <LabelChamp requis={territoireRequis}>Commune</LabelChamp>
          <SelectRecherche
            value={value.commune}
            onChange={handleCommuneChange}
            options={optionsCommunes}
            disabled={!departementSel}
            disabledMessage="Choisir un département d'abord"
            rechercherPlaceholder="Rechercher une commune…"
            ariaLabel="Commune"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <LabelChamp requis={territoireRequis}>Arrondissement</LabelChamp>
          <SelectRecherche
            value={value.arrondissement}
            onChange={handleArrondissementChange}
            options={optionsArrondissements}
            disabled={!communeSel}
            disabledMessage="Choisir une commune d'abord"
            rechercherPlaceholder="Rechercher un arrondissement…"
            ariaLabel="Arrondissement"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <LabelChamp requis={territoireRequis}>Quartier</LabelChamp>
          <SelectRecherche
            value={value.quartier}
            onChange={(quartier) => onChange({ quartier })}
            options={optionsQuartiers}
            disabled={!arrondissementSel}
            disabledMessage="Choisir un arrondissement d'abord"
            rechercherPlaceholder="Rechercher un quartier…"
            ariaLabel="Quartier"
          />
        </div>
      </div>

      <Input
        label="Adresse (repère, rue…)"
        value={value.adresse}
        onChange={e => onChange({ adresse: e.target.value })}
        placeholder="Ex : non loin du marché central"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
          Position
        </label>
        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
          Cliquez sur la carte, ou saisissez directement les coordonnées si vous les connaissez.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Latitude"
            type="text"
            inputMode="decimal"
            value={latText}
            onChange={e => handleLatChange(e.target.value)}
            placeholder="Ex : 6.37028"
            error={latErreur}
          />
          <Input
            label="Longitude"
            type="text"
            inputMode="decimal"
            value={lngText}
            onChange={e => handleLngChange(e.target.value)}
            placeholder="Ex : 2.39122"
            error={lngErreur}
          />
        </div>

        <CarteEtablissementLazy
          latitude={value.latitude}
          longitude={value.longitude}
          onPositionChange={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
        />
      </div>
    </div>
  );
}

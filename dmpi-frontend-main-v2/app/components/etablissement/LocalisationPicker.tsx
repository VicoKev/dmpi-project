import { useEffect, useState } from "react";
import Input from "../ui/Input";
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
}

const selectClass = "w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2";
const selectStyle = {
  borderColor: "var(--color-outline-variant)",
  backgroundColor: "var(--color-surface-container-lowest)",
  color: "var(--color-on-surface)",
};

export default function LocalisationPicker({ value, onChange }: LocalisationPickerProps) {
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

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Département</label>
          <select value={value.departement} onChange={e => handleDepartementChange(e.target.value)} className={selectClass} style={selectStyle}>
            <option value="">Sélectionner…</option>
            {departements.map(d => <option key={d.id_dep} value={d.lib_dep}>{d.lib_dep}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Commune</label>
          <select
            value={value.commune}
            onChange={e => handleCommuneChange(e.target.value)}
            disabled={!departementSel}
            className={selectClass}
            style={selectStyle}
          >
            <option value="">{departementSel ? "Sélectionner…" : "Choisir un département d'abord"}</option>
            {communes.map(c => <option key={c.id_com} value={c.lib_com}>{c.lib_com}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Arrondissement</label>
          <select
            value={value.arrondissement}
            onChange={e => handleArrondissementChange(e.target.value)}
            disabled={!communeSel}
            className={selectClass}
            style={selectStyle}
          >
            <option value="">{communeSel ? "Sélectionner…" : "Choisir une commune d'abord"}</option>
            {arrondissements.map(a => <option key={a.id_arrond} value={a.lib_arrond}>{a.lib_arrond}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>Quartier</label>
          <select
            value={value.quartier}
            onChange={e => onChange({ quartier: e.target.value })}
            disabled={!arrondissementSel}
            className={selectClass}
            style={selectStyle}
          >
            <option value="">{arrondissementSel ? "Sélectionner…" : "Choisir un arrondissement d'abord"}</option>
            {quartiers.map(q => <option key={q.id_quart} value={q.lib_quart}>{q.lib_quart}</option>)}
          </select>
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
          Position sur la carte {value.latitude != null && value.longitude != null && (
            <span className="font-normal text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
              ({value.latitude.toFixed(5)}, {value.longitude.toFixed(5)})
            </span>
          )}
        </label>
        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
          Cliquez sur la carte pour positionner l'établissement.
        </p>
        <CarteEtablissementLazy
          latitude={value.latitude}
          longitude={value.longitude}
          onPositionChange={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
        />
      </div>
    </div>
  );
}

// Sélecteur avec recherche — remplacement d'un <select> natif pour les
// listes trop longues à parcourir manuellement (ex: 59 types d'examen,
// des centaines de quartiers, un annuaire d'établissements qui grossit).
// Toutes les options restent visibles par défaut (contrairement à un
// autocomplete "base externe" type CIM-10) ; la recherche ne fait que filtrer.
import { useEffect, useMemo, useRef, useState } from "react";

export interface OptionSelectRecherche {
  value: string;
  label: string;
  /** Sous-titre affiché sous le libellé (ex: commune d'un établissement). */
  sousLabel?: string;
  /** Regroupe les options sous un en-tête (ex: catégorie d'examen). */
  groupe?: string;
  /** Reste visible mais non sélectionnable (ex: médecin indisponible). */
  disabled?: boolean;
}

interface SelectRechercheProps {
  value: string;
  onChange: (value: string) => void;
  options: OptionSelectRecherche[];
  placeholder?: string;
  rechercherPlaceholder?: string;
  disabled?: boolean;
  disabledMessage?: string;
  ariaLabel?: string;
}

const selectClass = "w-full py-3 px-4 rounded-xl border focus:outline-none focus:ring-2 flex items-center justify-between gap-2 text-left cursor-pointer";
const selectStyle = {
  borderColor: "var(--color-outline-variant)",
  backgroundColor: "var(--color-surface-container-lowest)",
  color: "var(--color-on-surface)",
};

export default function SelectRecherche({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  rechercherPlaceholder = "Rechercher…",
  disabled = false,
  disabledMessage,
  ariaLabel,
}: SelectRechercheProps) {
  const [ouvert, setOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const conteneurRef = useRef<HTMLDivElement>(null);
  const rechercheRef = useRef<HTMLInputElement>(null);

  const selection = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    function fermerSiExterieur(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  useEffect(() => {
    if (ouvert) {
      setRecherche("");
      rechercheRef.current?.focus();
    }
  }, [ouvert]);

  const optionsFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sousLabel?.toLowerCase().includes(q) ?? false)
    );
  }, [options, recherche]);

  const groupes = useMemo(() => {
    const parGroupe = new Map<string, OptionSelectRecherche[]>();
    for (const opt of optionsFiltrees) {
      const cle = opt.groupe ?? "";
      if (!parGroupe.has(cle)) parGroupe.set(cle, []);
      parGroupe.get(cle)!.push(opt);
    }
    return parGroupe;
  }, [optionsFiltrees]);

  if (disabled) {
    return (
      <div className={selectClass} style={{ ...selectStyle, cursor: "not-allowed", opacity: 0.6 }}>
        <span className="truncate">{disabledMessage ?? placeholder}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={conteneurRef}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOuvert((v) => !v)}
        className={selectClass}
        style={selectStyle}
      >
        <span className="truncate" style={{ color: selection ? "var(--color-on-surface)" : "var(--color-outline)" }}>
          {selection ? selection.label : placeholder}
        </span>
        <span className="material-symbols-outlined text-[18px] shrink-0" style={{ color: "var(--color-outline)" }}>
          {ouvert ? "expand_less" : "expand_more"}
        </span>
      </button>

      {ouvert && (
        <div
          className="absolute z-40 mt-1 w-full rounded-xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: "var(--color-surface-container-lowest)",
            boxShadow: "var(--shadow-card-hover)",
            border: "1px solid var(--color-outline-variant)",
            maxHeight: "18rem",
          }}
        >
          <div className="p-2 border-b shrink-0" style={{ borderColor: "var(--color-outline-variant)" }}>
            <div className="relative">
              <span
                className="material-symbols-outlined text-[16px] absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-outline)" }}
              >
                search
              </span>
              <input
                ref={rechercheRef}
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder={rechercherPlaceholder}
                className="w-full py-2 pl-8 pr-2 rounded-lg text-body-md focus:outline-none"
                style={{ backgroundColor: "var(--color-surface-container-low)", color: "var(--color-on-surface)" }}
              />
            </div>
          </div>

          <div className="overflow-y-auto">
            {optionsFiltrees.length === 0 ? (
              <p className="text-body-md px-4 py-3" style={{ color: "var(--color-on-surface-variant)" }}>
                Aucun résultat pour « {recherche} ».
              </p>
            ) : (
              Array.from(groupes.entries()).map(([groupe, opts]) => (
                <div key={groupe || "_"}>
                  {groupe && (
                    <p
                      className="text-label-bold uppercase tracking-wide px-4 pt-2.5 pb-1"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      {groupe}
                    </p>
                  )}
                  <ul>
                    {opts.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => { onChange(opt.value); setOuvert(false); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-surface-container)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          style={{ backgroundColor: opt.value === value ? "var(--color-surface-container)" : "transparent" }}
                        >
                          <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{opt.label}</p>
                          {opt.sousLabel && (
                            <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{opt.sousLabel}</p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

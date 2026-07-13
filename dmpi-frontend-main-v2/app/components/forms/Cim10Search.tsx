// Autocomplete de recherche CIM-10
import { useEffect, useRef, useState } from "react";
import Input from "../ui/Input";
import { searchCim10 } from "../../services/cim10Service";
import type { Cim10Code } from "../../types/consultation";

interface Cim10SearchProps {
  label?: string;
  required?: boolean;
  value: Cim10Code | null;
  onChange: (code: Cim10Code | null) => void;
  placeholder?: string;
}

export default function Cim10Search({
  label = "Diagnostic (CIM-10)",
  required,
  value,
  onChange,
  placeholder = "Rechercher un code ou un libellé…",
}: Cim10SearchProps) {
  const [query, setQuery] = useState(value ? `${value.code} — ${value.libelle}` : "");
  const [results, setResults] = useState<Cim10Code[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Si la query ne correspond plus à la sélection, on considère la sélection annulée
    if (value && query !== `${value.code} — ${value.libelle}`) {
      onChange(null);
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    searchCim10(query).then((res) => {
      if (!cancelled) {
        setResults(res);
        setIsSearching(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = (code: Cim10Code) => {
    onChange(code);
    setQuery(`${code.code} — ${code.libelle}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        label={label}
        required={required}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        leadingIcon="search"
        trailingIcon={value ? "close" : undefined}
        onTrailingIconClick={value ? handleClear : undefined}
        autoComplete="off"
      />

      {isOpen && query.trim().length >= 2 && (
        <div
          className="absolute z-40 mt-1 w-full rounded-xl overflow-hidden max-h-72 overflow-y-auto"
          style={{
            backgroundColor: "var(--color-surface-container-lowest)",
            boxShadow: "var(--shadow-card-hover)",
            border: "1px solid var(--color-outline-variant)",
          }}
        >
          {isSearching ? (
            <p
              className="text-body-md px-4 py-3"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Recherche…
            </p>
          ) : results.length === 0 ? (
            <p
              className="text-body-md px-4 py-3"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Aucun code trouvé pour « {query} ».
            </p>
          ) : (
            <ul>
              {results.map((code) => (
                <li key={code.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(code)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-surface-container)] transition-colors"
                  >
                    <p
                      className="text-body-md font-semibold"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      {code.code} — {code.libelle}
                    </p>
                    {code.chapitre && (
                      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                        {code.chapitre}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

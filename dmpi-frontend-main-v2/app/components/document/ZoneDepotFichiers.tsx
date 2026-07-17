// Zone de dépôt de fichiers — toute la surface est cliquable et accepte le
// glisser-déposer, contrairement à un <input type="file"> nu dont le petit
// bouton natif ("Choisir un fichier") passe facilement inaperçu.
import { useRef, useState } from "react";

interface FichierIconProps {
  nom: string;
}

function IconeFichier({ nom }: FichierIconProps) {
  const estPdf = nom.toLowerCase().endsWith(".pdf");
  return (
    <span className="material-symbols-outlined text-[20px]" style={{ color: "var(--color-primary)" }}>
      {estPdf ? "picture_as_pdf" : "image"}
    </span>
  );
}

interface ZoneDepotFichiersProps {
  fichiers: File[];
  onFichiersChange: (fichiers: File[]) => void;
  accept: string;
  multiple?: boolean;
  titre?: string;
  sousTitre?: string;
}

export default function ZoneDepotFichiers({
  fichiers,
  onFichiersChange,
  accept,
  multiple = true,
  titre = "Cliquez pour choisir un fichier, ou glissez-le ici",
  sousTitre = "JPEG, PNG ou PDF — 10 Mo max par fichier",
}: ZoneDepotFichiersProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [survole, setSurvole] = useState(false);

  const retirerFichier = (index: number) => {
    onFichiersChange(fichiers.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setSurvole(true); }}
        onDragLeave={() => setSurvole(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvole(false);
          if (e.dataTransfer.files?.length) onFichiersChange(Array.from(e.dataTransfer.files));
        }}
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed cursor-pointer text-center px-4 py-6 transition-colors duration-150"
        style={{
          borderColor: survole ? "var(--color-primary)" : "var(--color-outline-variant)",
          backgroundColor: survole ? "var(--color-primary-container)" : "var(--color-surface-container-low)",
        }}
      >
        <span
          className="material-symbols-outlined text-[28px]"
          style={{ color: survole ? "var(--color-primary)" : "var(--color-outline)" }}
        >
          upload_file
        </span>
        <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{titre}</p>
        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{sousTitre}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => { if (e.target.files?.length) onFichiersChange(Array.from(e.target.files)); e.target.value = ""; }}
          className="hidden"
        />
      </div>

      {fichiers.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {fichiers.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "var(--color-surface-container-low)" }}
            >
              <IconeFichier nom={f.name} />
              <span className="text-body-md flex-1 min-w-0 truncate" style={{ color: "var(--color-on-surface)" }}>{f.name}</span>
              <span className="text-caption shrink-0" style={{ color: "var(--color-on-surface-variant)" }}>{(f.size / 1024).toFixed(0)} Ko</span>
              <button
                type="button"
                onClick={() => retirerFichier(i)}
                className="material-symbols-outlined text-[18px] shrink-0"
                style={{ color: "var(--color-on-surface-variant)" }}
                aria-label={`Retirer ${f.name}`}
              >
                close
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

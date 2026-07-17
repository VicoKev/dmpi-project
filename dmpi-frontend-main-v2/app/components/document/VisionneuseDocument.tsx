// Modale plein écran pour agrandir une image ou ouvrir un PDF — le fichier
// original exige un header Authorization, donc pas d'URL directe possible :
// on charge le blob puis on l'affiche via une URL d'objet local.
import { useEffect, useState } from "react";
import { obtenirUrlFichier, type DocumentMedical, type FichierMedical } from "../../services/documentMedicalService";

interface VisionneuseDocumentProps {
  document: DocumentMedical;
  fichier: FichierMedical;
  onClose: () => void;
}

export default function VisionneuseDocument({ document: doc, fichier, onClose }: VisionneuseDocumentProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let urlLocale: string | null = null;
    let annule = false;

    obtenirUrlFichier(doc.id, fichier.id)
      .then((u) => {
        if (annule) {
          URL.revokeObjectURL(u);
          return;
        }
        urlLocale = u;
        setUrl(u);
      })
      .catch((err) => setErreur((err as Error).message || "Impossible de charger le fichier."));

    return () => {
      annule = true;
      if (urlLocale) URL.revokeObjectURL(urlLocale);
    };
  }, [doc.id, fichier.id]);

  const estPdf = fichier.type_mime === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-body-md font-semibold text-white">{fichier.nom_original}</span>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20"
          aria-label="Fermer"
        >
          <span className="material-symbols-outlined text-white text-[24px]">close</span>
        </button>
      </div>

      <div className="w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {erreur ? (
          <p className="text-body-md text-white">{erreur}</p>
        ) : !url ? (
          <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        ) : estPdf ? (
          <iframe src={url} title={fichier.nom_original} className="w-full h-full rounded-xl bg-white" />
        ) : (
          <img src={url} alt={fichier.nom_original} className="max-w-full max-h-full object-contain rounded-xl" />
        )}
      </div>
    </div>
  );
}

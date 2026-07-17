// Sélecteur d'horaires d'ouverture structuré — remplace la saisie libre
// ("Lun-Sam 8h-20h") par des choix jour par jour, pour éliminer le risque de
// faute de frappe dans un horaire tapé à la main.
import { useState } from "react";

export interface HorairesPickerProps {
  value: string;
  onChange: (value: string) => void;
}

type StatutJour = "ferme" | "ouvert" | "24h";

interface JourHoraire {
  statut: StatutJour;
  ouverture: string;
  fermeture: string;
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const JOURS_ABREGES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOUR_DEFAUT: JourHoraire = { statut: "ferme", ouverture: "08:00", fermeture: "18:00" };

const ALIAS_JOURS: Record<string, number> = {
  lun: 0, lundi: 0,
  mar: 1, mardi: 1,
  mer: 2, mercredi: 2,
  jeu: 3, jeudi: 3,
  ven: 4, vendredi: 4,
  sam: 5, samedi: 5,
  dim: 6, dimanche: 6,
};

function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/\p{Mark}/gu, "");
}

function formatHeure(h: string): string {
  const [hh, mm] = h.split(":");
  const heure = parseInt(hh, 10);
  return mm === "00" ? `${heure}h` : `${heure}h${mm}`;
}

const OPTIONS_HEURES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  const valeur = `${h}:${m}`;
  return { value: valeur, label: formatHeure(valeur) };
});

function libelleJour(j: JourHoraire): string {
  if (j.statut === "ferme") return "fermé";
  if (j.statut === "24h") return "24h/24";
  return `${formatHeure(j.ouverture)}-${formatHeure(j.fermeture)}`;
}

function genererHoraires(jours: JourHoraire[]): string {
  if (jours.every((j) => j.statut === "24h")) return "Ouvert 24h/24";
  if (jours.every((j) => j.statut === "ferme")) return "";

  const groupes: { debut: number; fin: number; libelle: string }[] = [];
  let i = 0;
  while (i < 7) {
    const lib = libelleJour(jours[i]);
    let j = i;
    while (j + 1 < 7 && libelleJour(jours[j + 1]) === lib) j++;
    groupes.push({ debut: i, fin: j, libelle: lib });
    i = j + 1;
  }
  return groupes
    .map((g) => {
      const jourLabel = g.debut === g.fin ? JOURS_ABREGES[g.debut] : `${JOURS_ABREGES[g.debut]}-${JOURS_ABREGES[g.fin]}`;
      return `${jourLabel} ${g.libelle}`;
    })
    .join(", ");
}

function trouverJour(brut: string): number {
  const cle = sansAccents(brut.toLowerCase().trim());
  return ALIAS_JOURS[cle] ?? -1;
}

/** Reconstruit un état structuré à partir d'une ancienne valeur en texte
 * libre — best effort, ne doit jamais planter sur un format inattendu (dans
 * ce cas on renvoie null et l'ancienne valeur est affichée en lecture seule). */
function parseHoraires(valeur: string): JourHoraire[] | null {
  if (!valeur.trim()) return null;
  if (/24h\s*\/?\s*24/i.test(valeur) && !valeur.includes(",")) {
    return JOURS.map(() => ({ ...JOUR_DEFAUT, statut: "24h" as StatutJour }));
  }

  const jours: JourHoraire[] = JOURS.map(() => ({ ...JOUR_DEFAUT }));
  const segments = valeur.split(",").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  let auMoinsUnSegmentReconnu = false;
  for (const segment of segments) {
    const m = segment.match(/^([a-zàâäéèêëïîôöùûüç]+)(?:-([a-zàâäéèêëïîôöùûüç]+))?\s+(.+)$/i);
    if (!m) continue;
    const [, jour1Brut, jour2Brut, reste] = m;
    const idx1 = trouverJour(jour1Brut);
    const idx2 = jour2Brut ? trouverJour(jour2Brut) : idx1;
    if (idx1 === -1 || idx2 === -1) continue;

    let statut: StatutJour = "ferme";
    let ouverture = JOUR_DEFAUT.ouverture;
    let fermeture = JOUR_DEFAUT.fermeture;
    if (/24h/i.test(reste)) {
      statut = "24h";
    } else if (/ferm/i.test(reste)) {
      statut = "ferme";
    } else {
      const heures = reste.match(/(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/i);
      if (!heures) continue;
      statut = "ouvert";
      ouverture = `${heures[1].padStart(2, "0")}:${heures[2] ?? "00"}`;
      fermeture = `${heures[3].padStart(2, "0")}:${heures[4] ?? "00"}`;
    }

    const debut = Math.min(idx1, idx2);
    const fin = Math.max(idx1, idx2);
    for (let k = debut; k <= fin; k++) {
      jours[k] = { statut, ouverture, fermeture };
    }
    auMoinsUnSegmentReconnu = true;
  }

  return auMoinsUnSegmentReconnu ? jours : null;
}

const STATUT_LABELS: Record<StatutJour, string> = {
  ferme: "Fermé",
  ouvert: "Horaires",
  "24h": "24h/24",
};

export default function HorairesPicker({ value, onChange }: HorairesPickerProps) {
  const [jours, setJours] = useState<JourHoraire[]>(
    () => parseHoraires(value) ?? JOURS.map(() => ({ ...JOUR_DEFAUT }))
  );
  const [ancienneValeurNonReconnue] = useState<string | null>(
    () => (value.trim() && !parseHoraires(value) ? value : null)
  );

  const mettreAJourJour = (index: number, patch: Partial<JourHoraire>) => {
    setJours((prev) => {
      const suivant = prev.map((j, i) => (i === index ? { ...j, ...patch } : j));
      onChange(genererHoraires(suivant));
      return suivant;
    });
  };

  const dupliquerLundiPartout = () => {
    setJours((prev) => {
      const suivant = prev.map(() => ({ ...prev[0] }));
      onChange(genererHoraires(suivant));
      return suivant;
    });
  };

  const apercu = genererHoraires(jours);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-body-md font-semibold" style={{ color: "var(--color-on-surface-variant)" }}>
          Horaires d'ouverture (optionnel)
        </label>
        <button
          type="button"
          onClick={dupliquerLundiPartout}
          className="text-caption font-semibold underline"
          style={{ color: "var(--color-primary)" }}
        >
          Copier le lundi vers tous les jours
        </button>
      </div>

      {ancienneValeurNonReconnue && (
        <p
          className="text-caption p-2.5 rounded-lg"
          style={{ backgroundColor: "var(--color-surface-container)", color: "var(--color-on-surface-variant)" }}
        >
          Ancien horaire saisi librement, non reconnu : « {ancienneValeurNonReconnue} ». Redéfinissez-le ci-dessous.
        </p>
      )}

      <div className="flex flex-col gap-2.5 rounded-xl border p-3" style={{ borderColor: "var(--color-outline-variant)" }}>
        {jours.map((j, i) => (
          <div key={JOURS[i]} className="flex flex-wrap items-center gap-2">
            <span className="text-body-md font-medium w-[76px] shrink-0" style={{ color: "var(--color-on-surface)" }}>
              {JOURS[i]}
            </span>
            <div className="flex gap-1.5">
              {(Object.keys(STATUT_LABELS) as StatutJour[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => mettreAJourJour(i, { statut: s })}
                  className="px-3 py-1.5 rounded-full text-caption font-semibold border transition-all"
                  style={{
                    borderColor: j.statut === s ? "var(--color-primary)" : "var(--color-outline-variant)",
                    backgroundColor: j.statut === s ? "var(--color-primary-container)" : "transparent",
                    color: j.statut === s ? "var(--color-on-primary-container)" : "var(--color-on-surface-variant)",
                  }}
                >
                  {STATUT_LABELS[s]}
                </button>
              ))}
            </div>
            {j.statut === "ouvert" && (
              <div className="flex items-center gap-1.5">
                <select
                  value={j.ouverture}
                  onChange={(e) => mettreAJourJour(i, { ouverture: e.target.value })}
                  className="rounded-lg border text-caption px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-on-surface)" }}
                >
                  {OPTIONS_HEURES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>à</span>
                <select
                  value={j.fermeture}
                  onChange={(e) => mettreAJourJour(i, { fermeture: e.target.value })}
                  className="rounded-lg border text-caption px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface-container-lowest)", color: "var(--color-on-surface)" }}
                >
                  {OPTIONS_HEURES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {apercu && (
        <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
          Aperçu : <strong style={{ color: "var(--color-on-surface)" }}>{apercu}</strong>
        </p>
      )}
    </div>
  );
}

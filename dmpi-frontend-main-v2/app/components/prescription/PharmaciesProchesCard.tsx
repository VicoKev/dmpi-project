// Suggestion de pharmacies partenaires proches pour une ordonnance donnée —
// utilisée côté patient (dossier/ordonnances) et côté médecin (confirmation
// juste après la rédaction, pour les patients sans compte portail).
import { useEffect, useState } from "react";
import Card, { CardHeader } from "../ui/Card";
import Button from "../ui/Button";
import {
  getPharmaciesProches,
  type PharmaciesProchesResponse,
  type ReferenceLocalisation,
  type PharmacieProche,
} from "../../services/prescriptionService";
import CartePharmaciesProchesLazy from "./CartePharmaciesProchesLazy";

interface PharmaciesProchesCardProps {
  prescriptionId: string;
}

/**
 * Google Maps ouvre un calcul d'itinéraire vers la pharmacie. Si on a une
 * position de référence (établissement, ou position réelle du patient après
 * "Utiliser ma position"), on la passe comme point de départ pour que
 * l'itinéraire corresponde exactement aux distances affichées ; sinon
 * Google Maps demande la position de l'appareil au moment de l'ouverture.
 */
function urlItineraire(reference: ReferenceLocalisation | null, pharmacie: PharmacieProche): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${pharmacie.latitude},${pharmacie.longitude}`,
    travelmode: "driving",
  });
  if (reference) {
    params.set("origin", `${reference.latitude},${reference.longitude}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function PharmaciesProchesCard({ prescriptionId }: PharmaciesProchesCardProps) {
  const [donnees, setDonnees] = useState<PharmaciesProchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [afficherCarte, setAfficherCarte] = useState(false);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);
  const [localisationErreur, setLocalisationErreur] = useState<string | null>(null);

  const charger = (position?: { latitude: number; longitude: number }) => {
    setLoading(true);
    setError(null);
    getPharmaciesProches(prescriptionId, position)
      .then(setDonnees)
      .catch((err) => setError((err as Error).message || "Impossible de charger les pharmacies proches."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescriptionId]);

  const utiliserMaPosition = () => {
    if (!navigator.geolocation) {
      setLocalisationErreur("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLocalisationEnCours(true);
    setLocalisationErreur(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalisationEnCours(false);
        charger({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setLocalisationEnCours(false);
        setLocalisationErreur("Position indisponible — vérifiez l'autorisation de géolocalisation.");
      },
      // enableHighAccuracy : sans ça, un appareil sans GPS (la plupart des
      // ordinateurs) retombe sur une estimation par Wi-Fi/IP, potentiellement
      // large de plusieurs dizaines à centaines de km — surtout peu fiable
      // avec les bases de géolocalisation IP disponibles pour le Bénin.
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <CardHeader icon="local_pharmacy" title="Pharmacies partenaires à proximité" />
        <Button
          variant="outline"
          size="sm"
          icon="my_location"
          loading={localisationEnCours}
          onClick={utiliserMaPosition}
        >
          Utiliser ma position
        </Button>
      </div>

      {localisationErreur && (
        <p className="text-caption mb-2" style={{ color: "var(--color-error)" }}>{localisationErreur}</p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--color-surface-container-low)" }} />
          ))}
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
          {error}
        </div>
      ) : !donnees?.reference ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Position de référence indisponible — impossible de suggérer une pharmacie à proximité pour le moment.
        </p>
      ) : donnees.pharmacies.length === 0 ? (
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Aucune pharmacie partenaire connue à proximité. Adressez-vous à la pharmacie de votre choix.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 mb-3">
            {donnees.pharmacies.map((p) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{p.nom}</p>
                    <span className="text-caption font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary-container)" }}>
                      {p.distance_km} km
                    </span>
                  </div>
                  <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                    {p.adresse ?? p.commune}{p.horaires ? ` · ${p.horaires}` : ""}
                  </p>
                  <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{p.telephone}</p>
                </div>
                <a
                  href={urlItineraire(donnees.reference, p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full font-sans font-bold transition-all duration-200 active:scale-95 cursor-pointer hover:bg-[var(--color-surface-container-low)] border-2 px-4 py-2 text-label-bold shrink-0 self-start sm:self-auto"
                  style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)", backgroundColor: "transparent" }}
                >
                  <span className="material-symbols-outlined text-[16px]">directions</span>
                  Itinéraire
                </a>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAfficherCarte((v) => !v)}
            className="text-caption font-semibold mb-2"
            style={{ color: "var(--color-primary)" }}
          >
            {afficherCarte ? "Masquer la carte" : "Voir sur la carte"}
          </button>

          {afficherCarte && (
            <CartePharmaciesProchesLazy reference={donnees.reference} pharmacies={donnees.pharmacies} />
          )}

          <p className="text-caption mt-3" style={{ color: "var(--color-on-surface-variant)" }}>
            Ces pharmacies proposent ce type de service. La disponibilité précise des médicaments n'est pas garantie —
            appelez avant de vous déplacer pour confirmer.
          </p>
        </>
      )}
    </Card>
  );
}

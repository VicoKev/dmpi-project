// Établissements de santé proches — Espace Patient
// Premier indice de décision pour se rendre rapidement dans un établissement
// à proximité — ne remplace ni un appel aux secours, ni le jugement médical.
import { useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";
import {
  getEtablissementsProches,
  type EtablissementsProchesResponse,
  type EtablissementProche,
} from "../../services/etablissementService";
import type { ReferenceLocalisation } from "../../services/prescriptionService";
import CarteEtablissementsProchesLazy from "../../components/etablissement/CarteEtablissementsProchesLazy";

function urlItineraire(reference: ReferenceLocalisation, etablissement: EtablissementProche): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${reference.latitude},${reference.longitude}`,
    destination: `${etablissement.latitude},${etablissement.longitude}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function PatientEtablissementsProches() {
  const [donnees, setDonnees] = useState<EtablissementsProchesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [afficherCarte, setAfficherCarte] = useState(false);
  const reference = donnees?.reference ?? null;

  const utiliserMaPosition = () => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getEtablissementsProches({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
          .then(setDonnees)
          .catch((err) => setError((err as Error).message || "Impossible de charger les établissements proches."))
          .finally(() => setLoading(false));
      },
      () => {
        setLoading(false);
        setError("Position indisponible — vérifiez l'autorisation de géolocalisation.");
      },
      // enableHighAccuracy : sans ça, un appareil sans GPS retombe sur une
      // estimation par Wi-Fi/IP, potentiellement large de plusieurs dizaines
      // à centaines de km — peu fiable avec les bases disponibles pour le Bénin.
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Établissements proches
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Trouvez rapidement l'établissement de santé le plus proche de votre position.
        </p>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardHeader icon="local_hospital" title="Établissements les plus proches" />
          <Button variant="outline" size="sm" icon="my_location" loading={loading} onClick={utiliserMaPosition}>
            Utiliser ma position
          </Button>
        </div>

        {!donnees && !loading && !error && (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Activez votre position pour voir les établissements de santé les plus proches de vous.
          </p>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <Spinner label="Localisation en cours…" />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl text-body-md" style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-on-error-container)" }}>
            {error}
          </div>
        )}

        {donnees && reference && (
          donnees.etablissements.length === 0 ? (
            <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
              Aucun établissement connu à proximité pour le moment.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-3">
                {donnees.etablissements.map((e) => (
                  <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--color-surface-container-low)" }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>{e.nom}</p>
                        <Badge variant="secondary" size="sm">{e.type}</Badge>
                        <span className="text-caption font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-on-primary-container)" }}>
                          {e.distance_km} km
                        </span>
                      </div>
                      <p className="text-caption truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                        {e.adresse ?? e.commune}
                      </p>
                      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>{e.telephone}</p>
                    </div>
                    <a
                      href={urlItineraire(reference, e)}
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
                <CarteEtablissementsProchesLazy reference={reference} etablissements={donnees.etablissements} />
              )}
            </>
          )
        )}
      </Card>

      <div className="flex items-start gap-2 p-4 rounded-xl" style={{ backgroundColor: "var(--color-warning-container)" }}>
        <span className="material-symbols-outlined text-[20px] shrink-0" style={{ color: "var(--color-on-warning-container)" }}>info</span>
        <p className="text-caption" style={{ color: "var(--color-on-warning-container)" }}>
          Cette liste n'est qu'un premier indice de proximité — elle ne garantit pas que l'établissement dispose du
          plateau technique adapté à votre besoin (un centre de santé communal n'a pas les mêmes moyens qu'un CHU).
          En cas d'urgence vitale, appelez les secours plutôt que de vous fier uniquement à la distance.
        </p>
      </div>
    </div>
  );
}

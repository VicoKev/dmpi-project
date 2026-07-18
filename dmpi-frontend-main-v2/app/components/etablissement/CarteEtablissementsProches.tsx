// Carte des établissements de santé proches (Leaflet). Touche `window` dès
// son chargement — à n'importer que dynamiquement, côté client (voir
// CarteEtablissementsProchesLazy.tsx).
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import type { EtablissementProche } from "../../services/etablissementService";
import type { ReferenceLocalisation } from "../../services/prescriptionService";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface CarteEtablissementsProchesProps {
  reference: ReferenceLocalisation;
  etablissements: EtablissementProche[];
}

function urlItineraire(reference: ReferenceLocalisation, etablissement: EtablissementProche): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${reference.latitude},${reference.longitude}`,
    destination: `${etablissement.latitude},${etablissement.longitude}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function AjusterCadrage({ points }: { points: [number, number][] }) {
  const map = useMap();
  if (points.length > 1) {
    map.fitBounds(points, { padding: [30, 30] });
  } else if (points.length === 1) {
    map.setView(points[0], 14);
  }
  return null;
}

export default function CarteEtablissementsProches({ reference, etablissements }: CarteEtablissementsProchesProps) {
  const pointReference: [number, number] = [reference.latitude, reference.longitude];
  const tousLesPoints: [number, number][] = [pointReference, ...etablissements.map((e): [number, number] => [e.latitude, e.longitude])];

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-outline-variant)", height: "320px" }}>
      <MapContainer center={pointReference} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjusterCadrage points={tousLesPoints} />
        <CircleMarker
          center={pointReference}
          radius={9}
          pathOptions={{ color: "var(--color-primary)", fillColor: "var(--color-primary)", fillOpacity: 0.8 }}
        >
          <Popup>Votre position</Popup>
        </CircleMarker>
        {etablissements.map((e) => (
          <Marker key={e.id} position={[e.latitude, e.longitude]}>
            <Popup>
              <strong>{e.nom}</strong>
              <br />
              {e.distance_km} km · {e.adresse ?? e.commune}
              <br />
              {e.telephone}
              <div style={{ marginTop: 8 }}>
                <a
                  href={urlItineraire(reference, e)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    borderRadius: 9999,
                    border: "2px solid var(--color-primary)",
                    color: "var(--color-primary)",
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "4px 10px",
                    textDecoration: "none",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>directions</span>
                  Itinéraire
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

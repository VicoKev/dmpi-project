// Carte des pharmacies proches (Leaflet). Comme CarteEtablissement, ce module
// touche `window` dès son chargement — à n'importer que dynamiquement,
// côté client (voir CartePharmaciesProchesLazy.tsx).
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";
import type { PharmacieProche, ReferenceLocalisation } from "../../services/prescriptionService";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface CartePharmaciesProchesProps {
  reference: ReferenceLocalisation;
  pharmacies: PharmacieProche[];
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

export default function CartePharmaciesProches({ reference, pharmacies }: CartePharmaciesProchesProps) {
  const pointReference: [number, number] = [reference.latitude, reference.longitude];
  const tousLesPoints: [number, number][] = [pointReference, ...pharmacies.map((p): [number, number] => [p.latitude, p.longitude])];

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-outline-variant)", height: "280px" }}>
      <MapContainer center={pointReference} zoom={13} style={{ height: "100%", width: "100%" }}>
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
          <Popup>{reference.source === "position_utilisateur" ? "Votre position" : "Établissement prescripteur"}</Popup>
        </CircleMarker>
        {pharmacies.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <strong>{p.nom}</strong>
              <br />
              {p.distance_km} km · {p.adresse ?? p.commune ?? ""}
              <br />
              {p.telephone}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

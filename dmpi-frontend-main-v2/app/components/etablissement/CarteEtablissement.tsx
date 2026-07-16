// Sélecteur de position sur carte (Leaflet). Ce module accède à `window` dès son
// chargement (bug connu de Leaflet) : il ne doit être importé que dynamiquement,
// côté client — jamais statiquement, sous peine de faire planter le rendu SSR.
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

// Correctif connu : les URLs d'icônes par défaut de Leaflet ne résolvent pas
// correctement une fois passées par le bundler (Vite).
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CENTRE_BENIN: [number, number] = [9.3077, 2.3158];

interface CarteEtablissementProps {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (lat: number, lng: number) => void;
}

function GestionnaireClic({ onPositionChange }: { onPositionChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Recentre la carte quand la position change depuis en dehors de la carte
// elle-même (ex : saisie manuelle des champs latitude/longitude) — sans quoi
// le marqueur peut se retrouver hors du cadre visible.
function RecentrerCarte({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    const zoom = map.getZoom() >= 13 ? map.getZoom() : 15;
    map.setView([latitude, longitude], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);
  return null;
}

export default function CarteEtablissement({ latitude, longitude, onPositionChange }: CarteEtablissementProps) {
  const position: [number, number] = latitude != null && longitude != null ? [latitude, longitude] : CENTRE_BENIN;

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-outline-variant)", height: "260px" }}>
      <MapContainer center={position} zoom={latitude != null ? 15 : 7} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GestionnaireClic onPositionChange={onPositionChange} />
        {latitude != null && longitude != null && (
          <>
            <Marker position={[latitude, longitude]} />
            <RecentrerCarte latitude={latitude} longitude={longitude} />
          </>
        )}
      </MapContainer>
    </div>
  );
}


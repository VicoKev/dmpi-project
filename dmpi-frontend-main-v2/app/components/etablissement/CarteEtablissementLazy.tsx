// Charge CarteEtablissement (et donc Leaflet) uniquement côté client, via import()
// dynamique — Leaflet accède à `window` dès l'évaluation de son module, ce qui
// casse le rendu SSR si le module est importé statiquement.
import { lazy, Suspense, useEffect, useState } from "react";

const CarteEtablissement = lazy(() => import("./CarteEtablissement"));

interface CarteEtablissementLazyProps {
  latitude: number | null;
  longitude: number | null;
  onPositionChange: (lat: number, lng: number) => void;
}

function Placeholder() {
  return (
    <div
      className="rounded-xl border flex items-center justify-center text-body-md"
      style={{ borderColor: "var(--color-outline-variant)", height: "260px", color: "var(--color-on-surface-variant)", backgroundColor: "var(--color-surface-container-low)" }}
    >
      Chargement de la carte…
    </div>
  );
}

export default function CarteEtablissementLazy(props: CarteEtablissementLazyProps) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  if (!monte) return <Placeholder />;

  return (
    <Suspense fallback={<Placeholder />}>
      <CarteEtablissement {...props} />
    </Suspense>
  );
}

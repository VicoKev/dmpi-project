// Charge CartePharmaciesProches (et donc Leaflet) uniquement côté client, via
// import() dynamique — voir CarteEtablissementLazy.tsx pour le même besoin.
import { lazy, Suspense, useEffect, useState } from "react";
import type { PharmacieProche, ReferenceLocalisation } from "../../services/prescriptionService";

const CartePharmaciesProches = lazy(() => import("./CartePharmaciesProches"));

interface CartePharmaciesProchesLazyProps {
  reference: ReferenceLocalisation;
  pharmacies: PharmacieProche[];
}

function Placeholder() {
  return (
    <div
      className="rounded-xl border flex items-center justify-center text-body-md"
      style={{ borderColor: "var(--color-outline-variant)", height: "280px", color: "var(--color-on-surface-variant)", backgroundColor: "var(--color-surface-container-low)" }}
    >
      Chargement de la carte…
    </div>
  );
}

export default function CartePharmaciesProchesLazy(props: CartePharmaciesProchesLazyProps) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  if (!monte) return <Placeholder />;

  return (
    <Suspense fallback={<Placeholder />}>
      <CartePharmaciesProches {...props} />
    </Suspense>
  );
}

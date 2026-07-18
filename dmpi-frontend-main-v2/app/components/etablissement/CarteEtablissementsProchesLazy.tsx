// Charge CarteEtablissementsProches (et donc Leaflet) uniquement côté client,
// via import() dynamique — voir CartePharmaciesProchesLazy.tsx pour le même besoin.
import { lazy, Suspense, useEffect, useState } from "react";
import type { EtablissementProche } from "../../services/etablissementService";
import type { ReferenceLocalisation } from "../../services/prescriptionService";

const CarteEtablissementsProches = lazy(() => import("./CarteEtablissementsProches"));

interface CarteEtablissementsProchesLazyProps {
  reference: ReferenceLocalisation;
  etablissements: EtablissementProche[];
}

function Placeholder() {
  return (
    <div
      className="rounded-xl border flex items-center justify-center text-body-md"
      style={{ borderColor: "var(--color-outline-variant)", height: "320px", color: "var(--color-on-surface-variant)", backgroundColor: "var(--color-surface-container-low)" }}
    >
      Chargement de la carte…
    </div>
  );
}

export default function CarteEtablissementsProchesLazy(props: CarteEtablissementsProchesLazyProps) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  if (!monte) return <Placeholder />;

  return (
    <Suspense fallback={<Placeholder />}>
      <CarteEtablissementsProches {...props} />
    </Suspense>
  );
}

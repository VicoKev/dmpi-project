// Liste de toutes les ordonnances du médecin — tous patients confondus
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatutBadge } from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Pagination from "../../components/ui/Pagination";
import { getPrescriptionsByPrescripteurPaginee } from "../../services/prescriptionService";
import { formatDateFr } from "../../services/patientService";
import type { Prescription } from "../../types/prescription";

const TAILLE_PAGE = 10;

export default function MedecinOrdonnances() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getPrescriptionsByPrescripteurPaginee(user.email, (page - 1) * TAILLE_PAGE, TAILLE_PAGE).then((res) => {
      if (!cancelled) {
        setPrescriptions(res.items);
        setTotal(res.total);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, page]);

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / TAILLE_PAGE));

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div>
        <h1 className="text-headline-lg" style={{ color: "var(--color-primary)" }}>
          Mes ordonnances
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Historique de toutes les ordonnances que vous avez rédigées.
        </p>
      </div>

      <Card>
        <CardHeader icon="prescriptions" title="Historique" />

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Chargement…" />
          </div>
        ) : prescriptions.length === 0 ? (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Vous n'avez encore rédigé aucune ordonnance.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {prescriptions.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/medecin/dossier/${p.patientNpi}`}
                  className="flex items-start justify-between gap-3 p-4 rounded-xl transition-colors hover:bg-[var(--color-surface-container)]"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <div className="min-w-0">
                    <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
                      {formatDateFr(p.date)} · NPI {p.patientNpi} · {p.etablissement}
                    </p>
                    <ul className="mt-1">
                      {p.lignes.map((ligne) => (
                        <li
                          key={ligne.id}
                          className="text-body-md font-semibold"
                          style={{ color: "var(--color-on-surface)" }}
                        >
                          {ligne.medicament} — {ligne.dosage}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <StatutBadge statut={p.statut} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} />
      </Card>
    </div>
  );
}

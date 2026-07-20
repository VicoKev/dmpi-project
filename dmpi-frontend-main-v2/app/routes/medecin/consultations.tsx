// Liste de toutes les consultations du médecin — tous patients confondus
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { useAuth } from "../../contexts/AuthContext";
import Card, { CardHeader } from "../../components/ui/Card";
import { StatutBadge } from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import Pagination from "../../components/ui/Pagination";
import { getConsultationsByMedecinPaginee } from "../../services/consultationService";
import { formatDateFr } from "../../services/patientService";
import type { Consultation } from "../../types/consultation";

const TAILLE_PAGE = 10;

export default function MedecinConsultations() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getConsultationsByMedecinPaginee(user.email, (page - 1) * TAILLE_PAGE, TAILLE_PAGE).then((res) => {
      if (!cancelled) {
        setConsultations(res.items);
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
          Mes consultations
        </h1>
        <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
          Historique de toutes vos consultations, tous patients confondus.
        </p>
      </div>

      <Card>
        <CardHeader icon="medical_services" title="Historique" />

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Chargement…" />
          </div>
        ) : consultations.length === 0 ? (
          <p className="text-body-md" style={{ color: "var(--color-on-surface-variant)" }}>
            Vous n'avez encore réalisé aucune consultation.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {consultations.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/medecin/dossier/${c.patientNpi}`}
                  className="flex items-start justify-between gap-3 p-4 rounded-xl transition-colors hover:bg-[var(--color-surface-container)]"
                  style={{ backgroundColor: "var(--color-surface-container-low)" }}
                >
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold" style={{ color: "var(--color-on-surface)" }}>
                      {c.motif}
                    </p>
                    <p className="text-caption mt-0.5" style={{ color: "var(--color-on-surface-variant)" }}>
                      {formatDateFr(c.date)} · NPI {c.patientNpi} · {c.etablissement}
                    </p>
                    {c.diagnosticPrincipal && (
                      <p className="text-caption mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                        <span className="font-semibold">Diagnostic :</span>{" "}
                        {c.diagnosticPrincipal.libelle} ({c.diagnosticPrincipal.code})
                      </p>
                    )}
                  </div>
                  <StatutBadge statut={c.statut} />
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

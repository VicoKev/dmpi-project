// Composant Pagination — Design system DMPI
import Button from "./Button";

interface PaginationProps {
  /** Page courante, indexée à partir de 1. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Nombre total d'éléments, pour l'indication "X éléments au total". */
  totalItems?: number | null;
}

export default function Pagination({ page, totalPages, onPageChange, totalItems }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pt-4 mt-2 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
      <p className="text-caption" style={{ color: "var(--color-on-surface-variant)" }}>
        Page {page} sur {totalPages}
        {typeof totalItems === "number" ? ` · ${totalItems} élément${totalItems > 1 ? "s" : ""} au total` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          icon="chevron_left"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon="chevron_right"
          iconPosition="right"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}

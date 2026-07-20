// Hook partagé pour le trio chargement/erreur/pagination répété dans
// quasiment toutes les pages de liste (consultations, ordonnances,
// utilisateurs, établissements...) — jusqu'ici chacune réécrivait sa propre
// version, avec des variantes (parfois sans gestion d'erreur du tout).
import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export interface ResultatPagine<T> {
  items: T[];
  /** null si le serveur n'a pas renvoyé de total (voir ReponsePaginee). */
  total: number | null;
}

interface UseListePagineeOptions {
  taillePage?: number;
  /** Dépendances (filtre, recherche...) qui doivent déclencher un rechargement
   * ET remettre la pagination à la première page — sinon une page devenue
   * hors limites afficherait une liste vide à tort. */
  deps?: DependencyList;
  /** Passe à false pour suspendre le chargement (ex : en attente d'un
   * pré-requis comme `user`) sans avoir à dupliquer la logique de garde. */
  active?: boolean;
}

export function useListePaginee<T>(
  fetcher: (skip: number, limit: number) => Promise<ResultatPagine<T>>,
  { taillePage = 10, deps = [], active = true }: UseListePagineeOptions = {}
) {
  // Toujours la dernière version du fetcher, sans obliger l'appelant à le
  // mémoïser lui-même avec useCallback à chaque site d'appel.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, deps);

  const load = useCallback(() => {
    if (!active) return;
    let annule = false;
    setLoading(true);
    setError(null);
    fetcherRef.current((page - 1) * taillePage, taillePage)
      .then((res) => {
        if (annule) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (annule) return;
        setError((err as Error).message || "Erreur lors du chargement.");
      })
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, taillePage, active, ...deps]);

  useEffect(() => load(), [load]);

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / taillePage));

  return { items, setItems, total, page, setPage, totalPages, loading, error, reload: load, taillePage };
}

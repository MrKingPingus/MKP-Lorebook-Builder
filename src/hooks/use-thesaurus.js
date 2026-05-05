// Per-word synonym lookup with module-level in-memory cache + paging.
// Cache survives component unmount within the session; never written to localStorage.
import { useState, useEffect, useRef } from 'react';
import { fetchSynonyms }      from '../services/thesaurus-service.js';
import { THESAURUS_PAGE_SIZE } from '../constants/limits.js';

// Module-level cache: word (lowercased) → string[] of synonyms.
// Intentionally lives outside React state so multiple chips share the same
// fetched results and re-opens of the popover are instant.
const cache = new Map();

/**
 * Lookup state for a single source word, with paging through the cached pool.
 * Returns:
 *   words      — the current page of synonyms (length ≤ THESAURUS_PAGE_SIZE)
 *   loading    — fetch in flight
 *   error      — null | 'network' | 'http'
 *   hasMore    — true if another page exists in the cached pool
 *   nextPage() — advance one page; safe to call when !hasMore (no-op)
 *   retry()    — re-fetch after an error
 *   total      — total synonyms in the pool (for display / debugging)
 */
export function useThesaurus(word) {
  const [pool,    setPool]    = useState(() => cache.get((word || '').toLowerCase()) ?? null);
  const [page,    setPage]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  // Track the word we last fetched for so a stale response from a previous
  // word doesn't overwrite the pool when the user moves to another chip.
  const activeWord = useRef(word);

  useEffect(() => {
    activeWord.current = word;
    setPage(0);
    setError(null);

    const key = (word || '').toLowerCase().trim();
    if (!key) { setPool([]); return; }

    const cached = cache.get(key);
    if (cached) { setPool(cached); return; }

    setPool(null);
    setLoading(true);
    fetchSynonyms(word).then((res) => {
      if (activeWord.current !== word) return; // ignore stale
      setLoading(false);
      if (res.ok) {
        cache.set(key, res.words);
        setPool(res.words);
      } else {
        setError(res.error);
      }
    });
  }, [word]);

  function nextPage() {
    if (!pool) return;
    const last = Math.ceil(pool.length / THESAURUS_PAGE_SIZE) - 1;
    if (page >= last) return;
    setPage((p) => p + 1);
  }

  function retry() {
    const key = (word || '').toLowerCase().trim();
    if (!key) return;
    setError(null);
    setLoading(true);
    fetchSynonyms(word).then((res) => {
      if (activeWord.current !== word) return;
      setLoading(false);
      if (res.ok) {
        cache.set(key, res.words);
        setPool(res.words);
      } else {
        setError(res.error);
      }
    });
  }

  const start = page * THESAURUS_PAGE_SIZE;
  const words = pool ? pool.slice(start, start + THESAURUS_PAGE_SIZE) : [];
  const hasMore = pool ? start + THESAURUS_PAGE_SIZE < pool.length : false;

  return {
    words,
    loading,
    error,
    hasMore,
    nextPage,
    retry,
    total: pool?.length ?? 0,
  };
}

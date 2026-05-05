// Per-word synonym lookup with module-level in-memory cache.
// Cache survives component unmount within the session; never written to localStorage.
import { useState, useEffect, useRef } from 'react';
import { fetchSynonyms } from '../services/thesaurus-service.js';

// Module-level cache: word (lowercased) → string[] of synonyms.
// Lives outside React state so multiple chips share fetched results and
// re-opens of the popover are instant.
const cache = new Map();

/**
 * Lookup state for a single source word.
 * Returns:
 *   words   — full pool of synonyms (rendered in a scrolling list)
 *   loading — fetch in flight
 *   error   — null | 'network' | 'http'
 *   retry() — re-fetch after an error
 */
export function useThesaurus(word) {
  const [pool,    setPool]    = useState(() => cache.get((word || '').toLowerCase()) ?? null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  // Track the word we last fetched for so a stale response from a previous
  // word doesn't overwrite the pool when the user moves to another chip.
  const activeWord = useRef(word);

  function load(w) {
    activeWord.current = w;
    setError(null);

    const key = (w || '').toLowerCase().trim();
    if (!key) { setPool([]); return; }

    const cached = cache.get(key);
    if (cached) { setPool(cached); return; }

    setPool(null);
    setLoading(true);
    fetchSynonyms(w).then((res) => {
      if (activeWord.current !== w) return;
      setLoading(false);
      if (res.ok) {
        cache.set(key, res.words);
        setPool(res.words);
      } else {
        setError(res.error);
      }
    });
  }

  useEffect(() => { load(word); }, [word]);

  function retry() { load(word); }

  return {
    words:   pool ?? [],
    loading,
    error,
    retry,
    total:   pool?.length ?? 0,
  };
}

// Sense-aware synonym lookup with module-level in-memory cache.
// Cache survives component unmount within the session; never written to localStorage.
import { useState, useEffect, useRef } from 'react';
import { fetchSynonyms } from '../services/thesaurus-service.js';

// Module-level cache: word (lowercased) → { senses, resolved } (the shape returned by the service).
const cache = new Map();

/**
 * Lookup state for a single source word, cycling through definition senses.
 *
 * Returns:
 *   senses       — array of { partOfSpeech, definition, synonyms[] }; capped server-side
 *   senseIndex   — current position in senses; clamped to 0..senses.length-1
 *   currentSense — senses[senseIndex] (or null when empty/loading/error)
 *   resolved     — the base form the synonyms actually came from (the lemma on
 *                  an inflection fallback, e.g. 'lives' → 'life'); null when unknown
 *   loading      — fetch in flight
 *   error        — null | 'network' | 'http'
 *   nextSense / prevSense — wrap around
 *   retry()      — re-fetch after an error
 */
export function useThesaurus(word) {
  const initialKey = (word || '').toLowerCase();
  const [senses,     setSenses]     = useState(() => cache.get(initialKey)?.senses ?? null);
  const [resolved,   setResolved]   = useState(() => cache.get(initialKey)?.resolved ?? null);
  const [senseIndex, setSenseIndex] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const activeWord = useRef(word);

  function load(w) {
    activeWord.current = w;
    setError(null);
    setSenseIndex(0);

    const key = (w || '').toLowerCase().trim();
    if (!key) { setSenses([]); setResolved(null); return; }

    const cached = cache.get(key);
    if (cached) { setSenses(cached.senses); setResolved(cached.resolved ?? null); return; }

    setSenses(null);
    setResolved(null);
    setLoading(true);
    fetchSynonyms(w).then((res) => {
      if (activeWord.current !== w) return;
      setLoading(false);
      if (res.ok) {
        cache.set(key, { senses: res.senses, resolved: res.resolved ?? null });
        setSenses(res.senses);
        setResolved(res.resolved ?? null);
      } else {
        setError(res.error);
      }
    });
  }

  useEffect(() => { load(word); }, [word]);

  function retry() { load(word); }

  function nextSense() {
    if (!senses || senses.length <= 1) return;
    setSenseIndex((i) => (i + 1) % senses.length);
  }
  function prevSense() {
    if (!senses || senses.length <= 1) return;
    setSenseIndex((i) => (i - 1 + senses.length) % senses.length);
  }

  const list         = senses ?? [];
  const currentSense = list.length > 0 ? list[Math.min(senseIndex, list.length - 1)] : null;

  return {
    senses:       list,
    senseIndex,
    currentSense,
    resolved,
    loading,
    error,
    nextSense,
    prevSense,
    retry,
  };
}

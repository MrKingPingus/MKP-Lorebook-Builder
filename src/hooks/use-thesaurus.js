// Sense-aware synonym lookup with module-level in-memory cache.
// Cache survives component unmount within the session; never written to localStorage.
import { useState, useEffect, useRef } from 'react';
import { fetchSynonyms, fetchRelated } from '../services/thesaurus-service.js';

// Module-level cache: word (lowercased) → { senses, resolved, relatedLoaded }.
// relatedLoaded persists so re-opening a widened word keeps its related senses.
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
 *   relatedLoaded / relatedLoading / relatedError — state of the on-demand
 *                  "related terms" widen (Datamuse looser matches, grouped by PoS)
 *   loadRelated() — lazily fetch related senses and append them to the cycle
 */
export function useThesaurus(word) {
  const initialKey = (word || '').toLowerCase();
  const [senses,     setSenses]     = useState(() => cache.get(initialKey)?.senses ?? null);
  const [resolved,   setResolved]   = useState(() => cache.get(initialKey)?.resolved ?? null);
  const [senseIndex, setSenseIndex] = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [relatedLoaded,  setRelatedLoaded]  = useState(() => cache.get(initialKey)?.relatedLoaded ?? false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError,   setRelatedError]   = useState(null);
  const activeWord = useRef(word);

  function load(w) {
    activeWord.current = w;
    setError(null);
    setRelatedError(null);
    setRelatedLoading(false);
    setSenseIndex(0);

    const key = (w || '').toLowerCase().trim();
    if (!key) { setSenses([]); setResolved(null); setRelatedLoaded(false); return; }

    const cached = cache.get(key);
    if (cached) {
      setSenses(cached.senses);
      setResolved(cached.resolved ?? null);
      setRelatedLoaded(cached.relatedLoaded ?? false);
      return;
    }

    setSenses(null);
    setResolved(null);
    setRelatedLoaded(false);
    setLoading(true);
    fetchSynonyms(w).then((res) => {
      if (activeWord.current !== w) return;
      setLoading(false);
      if (res.ok) {
        // relatedIncluded: the dictionary was empty and these senses ARE the
        // related fallback, so Related is already shown — don't offer it again.
        const included = !!res.relatedIncluded;
        cache.set(key, { senses: res.senses, resolved: res.resolved ?? null, relatedLoaded: included });
        setSenses(res.senses);
        setResolved(res.resolved ?? null);
        setRelatedLoaded(included);
      } else {
        setError(res.error);
      }
    });
  }

  useEffect(() => { load(word); }, [word]);

  function retry() { load(word); }

  // Widen the current word with looser Datamuse "related" terms appended to the
  // sense cycle. Lazy + idempotent (only fires when related isn't already
  // shown), fetches for the resolved base form, and jumps the cycle to the
  // first new sense so the widened terms are immediately visible.
  function loadRelated() {
    if (relatedLoading || relatedLoaded) return;
    const w = word;
    const target = (resolved || w || '').trim();
    if (!target) return;

    setRelatedError(null);
    setRelatedLoading(true);
    fetchRelated(target).then((res) => {
      if (activeWord.current !== w) return;
      setRelatedLoading(false);
      if (!res.ok) { setRelatedError(res.error); return; }

      const key  = (w || '').toLowerCase().trim();
      const base = senses ?? [];
      const next = [...base, ...res.senses];
      cache.set(key, { senses: next, resolved: resolved ?? null, relatedLoaded: true });
      setSenses(next);
      setRelatedLoaded(true);
      if (res.senses.length > 0) setSenseIndex(base.length); // first related sense
    });
  }

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
    relatedLoaded,
    relatedLoading,
    relatedError,
    loadRelated,
    nextSense,
    prevSense,
    retry,
  };
}

// Datamuse-backed synonym lookup. Plain fetch, no React, no localStorage.
// rel_syn = strict thesaurus synonyms (free, no API key, CORS-friendly).
import { THESAURUS_FETCH_MAX } from '../constants/limits.js';

const ENDPOINT = 'https://api.datamuse.com/words';

/**
 * Fetch up to THESAURUS_FETCH_MAX strict synonyms for a single word.
 * Returns a deduped, lowercased array; never throws — non-2xx and network
 * failures resolve to a tagged error so callers can render a retry state.
 *
 * Resolution shape: { ok: true, words: string[] } | { ok: false, error: 'network' | 'http' }
 */
export async function fetchSynonyms(word) {
  const q = (word || '').trim();
  if (!q) return { ok: true, words: [] };

  const url = `${ENDPOINT}?rel_syn=${encodeURIComponent(q)}&max=${THESAURUS_FETCH_MAX}`;

  let res;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, error: 'network' };
  }
  if (!res.ok) return { ok: false, error: 'http' };

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: 'http' };
  }
  if (!Array.isArray(body)) return { ok: true, words: [] };

  const seen = new Set();
  const lowerSource = q.toLowerCase();
  const words = [];
  for (const item of body) {
    const w = (item?.word || '').trim();
    if (!w) continue;
    const key = w.toLowerCase();
    if (key === lowerSource) continue; // never suggest the source word itself
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(w);
  }
  return { ok: true, words };
}

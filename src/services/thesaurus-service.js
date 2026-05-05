// Sense-aware synonym lookup via dictionaryapi.dev (free, no API key,
// CORS-friendly). Returns synonyms grouped by definition so the popover
// can disambiguate between meanings (e.g., "good" as moral vs. "good"
// as quality). Plain fetch, no React, no localStorage.
import { THESAURUS_SENSE_CAP } from '../constants/limits.js';

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Fetch sense-grouped synonyms for a single word. Never throws — failures
 * resolve to a tagged error so callers can render a retry state.
 *
 * Returns:
 *   { ok: true, senses: Array<{ partOfSpeech, definition, synonyms: string[] }> }
 *   { ok: false, error: 'network' | 'http' | 'notfound' }
 *
 * Senses are filtered to those with non-empty synonym lists, deduped
 * (a synonym appearing in multiple senses is kept in each — paged UI
 * lets users see context per sense), and capped to THESAURUS_SENSE_CAP.
 */
export async function fetchSynonyms(word) {
  const q = (word || '').trim();
  if (!q) return { ok: true, senses: [] };

  const url = `${ENDPOINT}/${encodeURIComponent(q)}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    return { ok: false, error: 'network' };
  }
  if (res.status === 404) return { ok: true, senses: [] };
  if (!res.ok) return { ok: false, error: 'http' };

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: 'http' };
  }
  if (!Array.isArray(body) || body.length === 0) return { ok: true, senses: [] };

  const lowerSource = q.toLowerCase();
  const senses = [];

  // The API can return multiple top-level entries (e.g., different etymologies).
  // Flatten meanings across all entries; dictionary order roughly tracks frequency.
  for (const entry of body) {
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    for (const meaning of meanings) {
      const partOfSpeech = meaning?.partOfSpeech || '';
      const definitions  = Array.isArray(meaning?.definitions) ? meaning.definitions : [];

      for (const def of definitions) {
        const definition = (def?.definition || '').trim();
        const rawSyns    = Array.isArray(def?.synonyms) ? def.synonyms : [];
        const synonyms   = dedupeSynonyms(rawSyns, lowerSource);
        if (synonyms.length === 0 || !definition) continue;
        senses.push({ partOfSpeech, definition, synonyms });
        if (senses.length >= THESAURUS_SENSE_CAP) {
          return { ok: true, senses };
        }
      }
    }
  }

  return { ok: true, senses };
}

function dedupeSynonyms(list, lowerSource) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const w = (item || '').trim();
    if (!w) continue;
    const key = w.toLowerCase();
    if (key === lowerSource) continue; // never suggest the source word itself
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

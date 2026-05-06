// Sense-aware synonym lookup via dictionaryapi.dev (free, no API key,
// CORS-friendly). Wraps WordNet/Wiktionary. Returns synonyms grouped by
// part of speech so the popover can disambiguate (e.g., "good" as an
// adjective vs. "good" as a noun). Plain fetch, no React, no localStorage.
//
// Note on granularity: dictionaryapi.dev populates the `synonyms` array at
// the meaning level (one per part-of-speech), not at the individual
// definition level — the per-definition `synonyms` field exists in the
// schema but is almost always empty in practice. So one "sense" entry here
// = one part of speech, not one individual definition.
//
// Inflection fallback: the API indexes lemmas (base forms), so plurals,
// gerunds, past tense, etc. typically 404. If the original word returns
// empty, we try base-form candidates from the lemmatizer in priority order.
import { THESAURUS_SENSE_CAP } from '../constants/limits.js';
import { lemmaCandidates }    from './lemmatize.js';

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Fetch sense-grouped synonyms for a single word, with lemma fallback.
 * Never throws — failures resolve to a tagged error so callers can render
 * a retry state.
 *
 * Returns:
 *   { ok: true, senses: Array<{ partOfSpeech, definition, synonyms: string[] }> }
 *   { ok: false, error: 'network' | 'http' }
 */
export async function fetchSynonyms(word) {
  const q = (word || '').trim();
  if (!q) return { ok: true, senses: [] };

  // Try the user's word first; if it has synonyms, we're done.
  const primary = await fetchOne(q);
  if (!primary.ok) return primary;
  if (primary.senses.length > 0) return primary;

  // Empty result on the original — try lemma candidates (features → feature,
  // lives → life, majoring → major). First hit wins; network errors on a
  // single candidate don't fail the whole lookup.
  for (const candidate of lemmaCandidates(q)) {
    const result = await fetchOne(candidate);
    if (!result.ok) continue;
    if (result.senses.length > 0) return result;
  }

  return { ok: true, senses: [] };
}

/** Single API call → senses[] (no lemma fallback). */
async function fetchOne(word) {
  const url = `${ENDPOINT}/${encodeURIComponent(word)}`;
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

  const lowerSource = word.toLowerCase();
  const senses = [];

  // Multiple top-level entries can occur (different etymologies). Flatten
  // meanings across all entries; each meaning yields one sense entry
  // (keyed by part of speech).
  for (const entry of body) {
    const meanings = Array.isArray(entry?.meanings) ? entry.meanings : [];
    for (const meaning of meanings) {
      const partOfSpeech = meaning?.partOfSpeech || '';
      const definitions  = Array.isArray(meaning?.definitions) ? meaning.definitions : [];

      // Primary source: PoS-level synonym pool. Fall back to a union of
      // any non-empty definition-level synonym arrays (rare but possible).
      let rawSyns = Array.isArray(meaning?.synonyms) ? meaning.synonyms : [];
      if (rawSyns.length === 0) {
        const merged = [];
        for (const def of definitions) {
          if (Array.isArray(def?.synonyms)) merged.push(...def.synonyms);
        }
        rawSyns = merged;
      }

      const synonyms = dedupeSynonyms(rawSyns, lowerSource);
      if (synonyms.length === 0) continue;

      // Representative gloss for this PoS = the first non-empty definition.
      const gloss = definitions.find((d) => (d?.definition || '').trim())?.definition?.trim() || '';

      senses.push({ partOfSpeech, definition: gloss, synonyms });
      if (senses.length >= THESAURUS_SENSE_CAP) {
        return { ok: true, senses };
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

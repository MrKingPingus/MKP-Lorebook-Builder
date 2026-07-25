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
import { THESAURUS_SENSE_CAP, THESAURUS_RELATED_MAX } from '../constants/limits.js';
import { lemmaCandidates }    from './lemmatize.js';

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';
// Datamuse means-like endpoint — the last-resort backup when the dictionary
// (and its lemma fallbacks) return nothing. Free, no key, CORS-friendly.
const DATAMUSE_ENDPOINT = 'https://api.datamuse.com/words';

/**
 * Fetch sense-grouped synonyms for a single word, with lemma fallback.
 * Never throws — failures resolve to a tagged error so callers can render
 * a retry state.
 *
 * Returns:
 *   { ok: true, senses: Array<{ partOfSpeech, definition, synonyms: string[] }>, resolved?: string }
 *   { ok: false, error: 'network' | 'http' }
 *
 * `resolved` is the word that actually produced the synonyms — the original
 * query on a direct hit, or the lemma when an inflection fallback matched
 * (e.g. word 'lives' → resolved 'life'). Callers can surface it so users
 * understand why the synonyms reflect the base form.
 */
export async function fetchSynonyms(word) {
  const q = (word || '').trim();
  if (!q) return { ok: true, senses: [] };

  // Try the user's word first; if it has synonyms, we're done.
  const primary = await fetchOne(q);
  if (!primary.ok) return primary;
  if (primary.senses.length > 0) return { ...primary, resolved: q };

  // Empty result on the original — try lemma candidates (features → feature,
  // lives → life, majoring → major). First hit wins; network errors on a
  // single candidate don't fail the whole lookup.
  for (const candidate of lemmaCandidates(q)) {
    const result = await fetchOne(candidate);
    if (!result.ok) continue;
    if (result.senses.length > 0) return { ...result, resolved: candidate };
  }

  // Dictionary + lemma fallback both came up empty. Last resort: Datamuse's
  // means-like endpoint for a single "related" sense. Looser than the curated
  // dictionary synonyms (can include the odd antonym), so it's only reached
  // when there would otherwise be nothing to show — no latency cost on the
  // common success path. Best-effort: any Datamuse failure just yields empty.
  const related = await fetchDatamuseRelated(q);
  if (related.senses.length > 0) return { ok: true, senses: related.senses, resolved: q };

  return { ok: true, senses: [] };
}

/**
 * Datamuse means-like fallback → a single "related" sense. Never throws and
 * never surfaces an error state: this is a best-effort backup, so any failure
 * (network, non-OK, malformed body, no results) resolves to an empty sense
 * list and the caller falls back to "No synonyms found."
 */
async function fetchDatamuseRelated(word) {
  const url = `${DATAMUSE_ENDPOINT}?ml=${encodeURIComponent(word)}&max=${THESAURUS_RELATED_MAX}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    return { senses: [] };
  }
  if (!res.ok) return { senses: [] };

  let body;
  try {
    body = await res.json();
  } catch {
    return { senses: [] };
  }
  if (!Array.isArray(body) || body.length === 0) return { senses: [] };

  const synonyms = dedupeSynonyms(body.map((d) => d?.word), word.toLowerCase());
  if (synonyms.length === 0) return { senses: [] };

  return {
    senses: [{ partOfSpeech: 'related', definition: 'broader related words', synonyms }],
  };
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

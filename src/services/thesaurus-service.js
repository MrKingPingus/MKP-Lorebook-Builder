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
import {
  THESAURUS_SENSE_CAP,
  THESAURUS_RELATED_MAX,
  THESAURUS_RELATED_MIN_FREQ,
  THESAURUS_RELATED_PER_POS,
} from '../constants/limits.js';
import { lemmaCandidates }    from './lemmatize.js';

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';
// Datamuse means-like endpoint — powers the looser "related" terms, both as an
// auto fallback when the dictionary returns nothing and on demand via the
// popover's Related button. Free, no key, CORS-friendly.
const DATAMUSE_ENDPOINT = 'https://api.datamuse.com/words';

/**
 * Fetch sense-grouped synonyms for a single word, with lemma fallback.
 * Never throws — failures resolve to a tagged error so callers can render
 * a retry state.
 *
 * Returns:
 *   { ok: true, senses: Array<{ partOfSpeech, definition, synonyms: string[] }>, resolved?: string, relatedIncluded?: boolean }
 *   { ok: false, error: 'network' | 'http' }
 *
 * `resolved` is the word that actually produced the synonyms — the original
 * query on a direct hit, or the lemma when an inflection fallback matched
 * (e.g. word 'lives' → resolved 'life'). Callers can surface it so users
 * understand why the synonyms reflect the base form.
 *
 * `relatedIncluded` is true when the dictionary came up empty and the returned
 * senses are the Datamuse "related" fallback (so callers know Related is
 * already on screen and shouldn't offer to load it again).
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
  // means-like endpoint, grouped into per-part-of-speech "related" senses.
  // Looser than the curated dictionary synonyms (can include the odd antonym),
  // so it's only auto-shown when there would otherwise be nothing — no latency
  // cost on the common success path. Best-effort: any Datamuse failure yields
  // empty and the caller falls back to "No synonyms found."
  const related = await fetchRelated(q);
  if (related.ok && related.senses.length > 0) {
    return { ok: true, senses: related.senses, resolved: q, relatedIncluded: true };
  }

  return { ok: true, senses: [] };
}

/**
 * On-demand Datamuse "related" lookup → looser terms than the dictionary,
 * grouped by part of speech and frequency-trimmed. Used two ways: as the
 * empty-only auto fallback inside fetchSynonyms, and by the popover's "Related"
 * button to widen a word that already has (possibly sparse) dictionary
 * synonyms. Unlike fetchSynonyms this reports an error channel so the button
 * can show a retry.
 *
 * Returns:
 *   { ok: true, senses: Array<{ partOfSpeech: 'related', definition, synonyms }> }
 *   { ok: false, error: 'network' | 'http' }
 */
export async function fetchRelated(word) {
  const q = (word || '').trim();
  if (!q) return { ok: true, senses: [] };

  // md=p → part-of-speech tags; md=f → usage frequency. Both ride one request.
  const url = `${DATAMUSE_ENDPOINT}?ml=${encodeURIComponent(q)}&md=p,f&max=${THESAURUS_RELATED_MAX}`;
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
  if (!Array.isArray(body)) return { ok: true, senses: [] };

  return { ok: true, senses: groupRelatedByPos(body, q.toLowerCase()) };
}

// Datamuse part-of-speech tag → display label + sort order. Anything else
// (proper nouns, unknown) collapses into a trailing "other" bucket.
const POS_LABELS = [
  ['n',   'nouns'],
  ['v',   'verbs'],
  ['adj', 'adjectives'],
  ['adv', 'adverbs'],
];

/**
 * Turn Datamuse md=p,f results into per-PoS "related" senses: drop the source
 * word and low-frequency noise, bucket by the word's primary part of speech,
 * cap each bucket, and emit buckets in noun→verb→adjective→adverb→other order.
 * Each Datamuse item looks like { word, score, tags: ['n', 'f:12.34'] }.
 */
function groupRelatedByPos(items, lowerSource) {
  const buckets = new Map(); // posKey -> ordered string[]
  const seen = new Set();

  for (const item of items) {
    const w = (item?.word || '').trim();
    if (!w) continue;
    const key = w.toLowerCase();
    if (key === lowerSource || seen.has(key)) continue;

    const tags = Array.isArray(item?.tags) ? item.tags : [];

    // Frequency trim: only drops words that carry a frequency tag below the
    // floor; words with no f: tag are kept rather than guessed at.
    const freqTag = tags.find((t) => typeof t === 'string' && t.startsWith('f:'));
    if (freqTag) {
      const freq = parseFloat(freqTag.slice(2));
      if (!Number.isNaN(freq) && freq < THESAURUS_RELATED_MIN_FREQ) continue;
    }

    // Primary part of speech = first recognised PoS tag; else "other".
    const posKey = tags.find((t) => POS_LABELS.some(([code]) => code === t)) || 'other';

    seen.add(key);
    if (!buckets.has(posKey)) buckets.set(posKey, []);
    const bucket = buckets.get(posKey);
    if (bucket.length < THESAURUS_RELATED_PER_POS) bucket.push(w);
  }

  const senses = [];
  for (const [code, label] of [...POS_LABELS, ['other', 'other']]) {
    const words = buckets.get(code);
    if (words && words.length > 0) {
      senses.push({ partOfSpeech: 'related', definition: label, synonyms: words });
    }
  }
  return senses;
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

// Generate trigger keyword suggestions from entry name and description text;
// proper nouns (capitalized words) are weighted first and preserve their original casing
import { SUGGESTION_LIMIT, SUGGESTION_DESC_WORD_LIMIT } from '../constants/limits.js';

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','as','is','was','are','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might','shall',
  'that','this','these','those','it','its','he','she','they','we','you','i',
  'his','her','their','our','my','your','its','who','which','what','when',
  'where','why','how','not','no','nor','so','yet','both','either','neither',
  'than','then','there','here','into','onto','upon','about','above','after',
  'before','between','during','through','under','over','also','just','more',
  'other','such','same','own','each','all','any','few','some','very',
]);

// One word: a letter, then letters, apostrophes and hyphens. Capitals are
// allowed after the first letter; "SHAWTY" was read as six one-letter words
// when only lowercase could follow, and the pairs of those became "S H".
const WORD = /[A-Za-z][A-Za-z'’-]*/g;

/**
 * Lowercase any clause written entirely in capitals. A shouted line ("SHAWTY
 * GOT LOW") is ordinary words, not a row of names, so it should suggest what
 * the same line in lowercase would. An all-caps word inside normal text
 * ("Organization XIII") is untouched and still reads as a name.
 */
function calmShouting(text) {
  return String(text ?? '').replace(/[^.!?,;:\n]+/g, (clause) => {
    const words = clause.match(WORD) || [];
    const letters = words.filter((w) => /[A-Za-z]{2}/.test(w));
    const shouted = letters.length >= 2 && letters.every((w) => w === w.toUpperCase());
    return shouted ? clause.toLowerCase() : clause;
  });
}

function isCapitalized(w) {
  return w.length > 0 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase();
}

/** Extract proper-noun tokens from raw text, preserving original casing. */
function extractProperNouns(text) {
  const words = (text.match(WORD) || []).filter((w) => w.length >= 2);
  return words.filter((w) => {
    if (w.length < 2) return false;
    return isCapitalized(w) && !STOP_WORDS.has(w.toLowerCase());
  });
}

/** Extract all significant lowercase tokens from text. */
function extractTokens(text) {
  const words = (text.match(WORD) || []).filter((w) => w.length >= 2);
  return words
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Deduplicate case-insensitively, keeping the first casing encountered. */
function uniqueCaseInsensitive(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

/**
 * Build the full ordered candidate pool for an entry.
 * Proper nouns from name and description preserve their original casing;
 * common tokens remain lowercased.
 */
export function generateSuggestionPool(entry, existingTriggers = []) {
  const existing = new Set(existingTriggers.map((t) => t.toLowerCase()));
  const nameText = entry.name  || '';
  const descText = calmShouting(entry.description || '');

  const candidates = [];

  // Full name as first suggestion — preserve original casing
  if (nameText.trim()) {
    candidates.push(nameText.trim());
  }

  // Proper nouns from name (highest weight — added early). An all-caps name
  // is read like a shouted line; the full name above keeps its own casing.
  candidates.push(...extractProperNouns(calmShouting(nameText)));

  // Proper nouns from description
  candidates.push(...extractProperNouns(descText));

  // All tokens from name (lowercase)
  candidates.push(...extractTokens(nameText));

  // All tokens from description (cap to first N words to avoid noise)
  const descWords = descText.split(/\s+/).slice(0, SUGGESTION_DESC_WORD_LIMIT).join(' ');
  candidates.push(...extractTokens(descWords));

  // Multi-word phrases: adjacent proper-noun pairs within the same clause — preserve casing.
  // Splitting on sentence/clause punctuation prevents cross-boundary pairs like "Reika. Reika".
  const clauses = descText.split(/[.!?,;:\n]+/);
  for (const clause of clauses) {
    const rawWords = clause.match(WORD) || [];
    for (let i = 0; i < rawWords.length - 1; i++) {
      const a = rawWords[i];
      const b = rawWords[i + 1];
      if (
        isCapitalized(a) && isCapitalized(b) &&
        !STOP_WORDS.has(a.toLowerCase()) && !STOP_WORDS.has(b.toLowerCase())
      ) {
        candidates.push(`${a} ${b}`);
      }
    }
  }

  return uniqueCaseInsensitive(candidates)
    .filter((s) => s.length > 1 && !existing.has(s.toLowerCase()));
}

/**
 * Generate up to `limit` trigger keyword suggestions for an entry.
 * Returns a single page from the pool, starting at `pageIndex * limit`;
 * wraps around when the pool is exhausted so repeated rerolls cycle forever.
 */
export function generateSuggestions(entry, existingTriggers = [], limit = SUGGESTION_LIMIT, pageIndex = 0) {
  const pool = generateSuggestionPool(entry, existingTriggers);
  if (pool.length === 0) return [];
  if (pool.length <= limit) return pool;

  const start = (pageIndex * limit) % pool.length;
  if (start + limit <= pool.length) {
    return pool.slice(start, start + limit);
  }
  // Wrap: take tail + head to fill the window
  return [...pool.slice(start), ...pool.slice(0, limit - (pool.length - start))];
}

/** How many reroll pages exist before the cycle repeats. */
export function countRerollPages(entry, existingTriggers = [], limit = SUGGESTION_LIMIT) {
  const pool = generateSuggestionPool(entry, existingTriggers);
  if (pool.length <= limit) return 1;
  return Math.ceil(pool.length / limit);
}

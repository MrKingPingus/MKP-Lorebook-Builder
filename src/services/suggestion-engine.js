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

function isCapitalized(w) {
  return w.length > 0 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase();
}

/** Extract proper-noun tokens from raw text, preserving original casing. */
function extractProperNouns(text) {
  const words = text.match(/[A-Za-z][a-z''-]{1,}/g) || [];
  return words.filter((w) => {
    if (w.length < 2) return false;
    return isCapitalized(w) && !STOP_WORDS.has(w.toLowerCase());
  });
}

/** Extract all significant lowercase tokens from text. */
function extractTokens(text) {
  const words = text.match(/[a-zA-Z][a-z''-]{1,}/g) || [];
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
  const descText = entry.description || '';

  const candidates = [];

  // Full name as first suggestion — preserve original casing
  if (nameText.trim()) {
    candidates.push(nameText.trim());
  }

  // Proper nouns from name (highest weight — added early)
  candidates.push(...extractProperNouns(nameText));

  // Proper nouns from description
  candidates.push(...extractProperNouns(descText));

  // All tokens from name (lowercase)
  candidates.push(...extractTokens(nameText));

  // All tokens from description (cap to first N words to avoid noise)
  const descWords = descText.split(/\s+/).slice(0, SUGGESTION_DESC_WORD_LIMIT).join(' ');
  candidates.push(...extractTokens(descWords));

  // Multi-word phrases: adjacent proper-noun pairs from description — preserve casing
  const rawWords = descText.match(/[A-Za-z][a-z''-]*/g) || [];
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

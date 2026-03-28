// Generate trigger keyword suggestions from entry name and description text;
// proper nouns (capitalized words) are weighted first
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

/** Extract proper-noun tokens from raw text (preserves original casing for detection). */
function extractProperNouns(text) {
  const words = text.match(/[A-Za-z][a-z''-]{1,}/g) || [];
  return words.filter((w) => {
    if (w.length < 2) return false;
    const isCapitalized = w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase();
    return isCapitalized && !STOP_WORDS.has(w.toLowerCase());
  }).map((w) => w.toLowerCase());
}

/** Extract all significant lowercase tokens from text. */
function extractTokens(text) {
  const words = text.match(/[a-zA-Z][a-z''-]{1,}/g) || [];
  return words
    .map((w) => w.toLowerCase())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Generate up to `limit` trigger keyword suggestions for an entry.
 * Draws from name and description text; proper nouns are weighted first.
 */
export function generateSuggestions(entry, existingTriggers = [], limit = 12) {
  const existing = new Set(existingTriggers.map((t) => t.toLowerCase()));
  const nameText = entry.name  || '';
  const descText = entry.description || '';

  const candidates = [];

  // Full name as first suggestion
  if (nameText.trim()) {
    candidates.push(nameText.trim().toLowerCase());
  }

  // Proper nouns from name (highest weight — added early)
  candidates.push(...extractProperNouns(nameText));

  // Proper nouns from description
  candidates.push(...extractProperNouns(descText));

  // All tokens from name
  candidates.push(...extractTokens(nameText));

  // All tokens from description (cap to first 60 words to avoid noise)
  const descWords = descText.split(/\s+/).slice(0, 60).join(' ');
  candidates.push(...extractTokens(descWords));

  // Multi-word phrases: adjacent proper-noun pairs from description
  const rawWords = descText.match(/[A-Za-z][a-z''-]*/g) || [];
  for (let i = 0; i < rawWords.length - 1; i++) {
    const a = rawWords[i];
    const b = rawWords[i + 1];
    if (
      a[0] === a[0].toUpperCase() && a[0] !== a[0].toLowerCase() &&
      b[0] === b[0].toUpperCase() && b[0] !== b[0].toLowerCase() &&
      !STOP_WORDS.has(a.toLowerCase()) && !STOP_WORDS.has(b.toLowerCase())
    ) {
      candidates.push(`${a.toLowerCase()} ${b.toLowerCase()}`);
    }
  }

  return unique(candidates)
    .filter((s) => s.length > 1 && !existing.has(s))
    .slice(0, limit);
}

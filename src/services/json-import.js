// Validate and normalize a raw JSON lorebook object before applying it to the store
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';
import { createEmptyEntry } from './entry-factory.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

// Known alternative field names that AI models commonly produce
const FIELD_ALIASES = {
  description: ['content', 'text', 'body', 'desc', 'lore', 'entry'],
  triggers:    ['keywords', 'keys', 'tags', 'key', 'activation_keys'],
  name:        ['title', 'label', 'display_name', 'displayName'],
};

/**
 * Scan raw entries for common alternative field names that don't match our schema.
 * Returns an array of human-readable hint strings (empty if everything looks fine).
 */
function detectFieldHints(rawEntries) {
  const hints = [];
  if (!rawEntries.length) return hints;

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    let missingCount = 0;
    const aliasHits = {};

    for (const e of rawEntries) {
      const has = field === 'triggers'
        ? Array.isArray(e.triggers) && e.triggers.length > 0
        : typeof e[field] === 'string' && e[field].length > 0;

      if (!has) {
        missingCount++;
        for (const alias of aliases) {
          const val = e[alias];
          if (val != null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
            aliasHits[alias] = (aliasHits[alias] || 0) + 1;
          }
        }
      }
    }

    if (missingCount > rawEntries.length / 2) {
      const top = Object.entries(aliasHits).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        hints.push(`Your entries use \u201c${top[0]}\u201d — rename it to \u201c${field}\u201d.`);
      }
    }
  }

  return hints;
}

/**
 * Normalize a type string to a valid entry type id.
 * Accepts lowercase-snake ("plot_event") and PascalCase ("PlotEvent").
 */
function normalizeType(raw) {
  if (typeof raw !== 'string') return DEFAULT_TYPE;
  const snake = raw.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  return VALID_TYPES.has(snake) ? snake : DEFAULT_TYPE;
}

/**
 * Validate and normalize a parsed JSON object into a lorebook shape.
 * Accepts:
 *   - { entries: [...] }           — standard lorebook wrapper
 *   - { entries: { "1": {}, … } }  — keyed object of entries
 *   - [ {...}, {...} ]             — bare array of entries (e.g. AI-generated)
 * Returns { ok: true, lorebook } or { ok: false, error: string }.
 */
export function importFromJson(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Not a valid JSON object.' };
  }

  // Bare array — treat the whole thing as the entries list
  if (Array.isArray(raw)) {
    return importFromJson({ entries: raw });
  }

  let rawEntries;
  if (Array.isArray(raw.entries)) {
    rawEntries = raw.entries;
  } else if (raw.entries && typeof raw.entries === 'object') {
    rawEntries = Object.values(raw.entries);
  } else {
    rawEntries = [];
  }

  const normalizedEntries = rawEntries.map((e) => ({
    ...createEmptyEntry(),
    name:        typeof e.name === 'string'        ? e.name        : '',
    type:        normalizeType(e.type),
    triggers:    Array.isArray(e.triggers)         ? e.triggers.map(String) : [],
    description: typeof e.description === 'string' ? e.description : '',
  }));

  const hints = detectFieldHints(rawEntries);

  const lorebook = {
    id:      typeof raw.id === 'string'   ? raw.id   : '',
    name:    typeof raw.name === 'string' ? raw.name : 'Imported Lorebook',
    entries: normalizedEntries,
  };

  return { ok: true, lorebook, hints };
}

/**
 * Read a File object and return a parsed JSON object.
 */
export async function readJsonFile(file) {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
}

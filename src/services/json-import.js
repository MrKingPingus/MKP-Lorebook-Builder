// Validate and normalize a raw JSON lorebook object before applying it to the store
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';
import { MAX_TRIGGERS } from '../constants/limits.js';
import { createEmptyEntry } from './entry-factory.js';
import { unescapeImportedEntry } from './unescape-import.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

/**
 * Coerce any value into an array of strings.
 * Accepts arrays (elements stringified), single strings (wrapped), or anything else (empty).
 */
function toStringArray(val) {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val.filter((x) => x != null && x !== '').map(String);
  }
  if (typeof val === 'string') {
    return val === '' ? [] : [val];
  }
  return [];
}

/**
 * Deduplicate an array of strings, preserving first-seen order and casing.
 */
function unique(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    if (s !== '' && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
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
 * Normalize a single raw entry into our schema, mirroring the target platform's
 * lenient field-alias behavior. Returns the normalized entry plus a warning
 * describing any fields that ended up blank after all fallbacks were exhausted.
 */
function normalizeEntry(raw, index) {
  const src = (raw && typeof raw === 'object') ? raw : {};

  // Triggers — merge every alias the target platform accepts, dedupe, cap at MAX_TRIGGERS
  const triggers = unique([
    ...toStringArray(src.triggers),
    ...toStringArray(src.trigger),
    ...toStringArray(src.Trigger),
    ...toStringArray(src.Triggers),
    ...toStringArray(src.keys),
    ...toStringArray(src.key),
    ...toStringArray(src.keysecondary),
    ...toStringArray(src.secondary_keys),
  ]).slice(0, MAX_TRIGGERS);

  // Name — name → title → first trigger → ""
  let name = '';
  if (typeof src.name === 'string' && src.name) name = src.name;
  else if (typeof src.title === 'string' && src.title) name = src.title;
  else if (triggers.length > 0) name = triggers[0];

  // Description — description → content → text → entry.text → ""
  let description = '';
  if (typeof src.description === 'string' && src.description) description = src.description;
  else if (typeof src.content === 'string' && src.content) description = src.content;
  else if (typeof src.text === 'string' && src.text) description = src.text;
  else if (src.entry && typeof src.entry.text === 'string' && src.entry.text) description = src.entry.text;

  const blanked = [];
  if (!name) blanked.push('name');
  if (!description) blanked.push('description');

  return {
    entry: {
      ...createEmptyEntry(),
      name,
      type: normalizeType(src.type),
      triggers,
      description,
    },
    warning: blanked.length > 0 ? { index, fields: blanked } : null,
  };
}

/**
 * Validate and normalize a parsed JSON object into a lorebook shape.
 * Accepts:
 *   - { entries: [...] }           — standard lorebook wrapper
 *   - { entries: { "1": {}, … } }  — keyed object of entries
 *   - [ {...}, {...} ]             — bare array of entries (e.g. AI-generated)
 * Returns { ok: true, lorebook, warnings } or { ok: false, error: string }.
 *
 * This importer is intentionally lenient: it accepts a wide range of field
 * aliases (matching the target platform) rather than rejecting on mismatch.
 * Any entries whose name or description could not be resolved from any alias
 * are imported with those fields blanked and reported in `warnings` so the
 * caller can surface a non-blocking notice to the user.
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

  const normalized = rawEntries.map((e, i) => normalizeEntry(e, i));
  const normalizedEntries = normalized.map((n) => unescapeImportedEntry(n.entry));
  const warnings = normalized.map((n) => n.warning).filter(Boolean);

  const lorebook = {
    id:      typeof raw.id === 'string'   ? raw.id   : '',
    name:    typeof raw.name === 'string' ? raw.name : 'Imported Lorebook',
    entries: normalizedEntries,
  };

  return { ok: true, lorebook, warnings };
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

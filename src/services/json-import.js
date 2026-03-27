// Validate and normalize a raw JSON lorebook object before applying it to the store
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';
import { createEmptyEntry } from './entry-factory.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

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
 * Accepts entries as an array OR as a keyed object ({ "1": {...}, "2": {...} }).
 * Returns { ok: true, lorebook } or { ok: false, error: string }.
 */
export function importFromJson(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Not a valid JSON object.' };
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

  const lorebook = {
    id:      typeof raw.id === 'string'   ? raw.id   : '',
    name:    typeof raw.name === 'string' ? raw.name : 'Imported Lorebook',
    entries: normalizedEntries,
  };

  return { ok: true, lorebook };
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

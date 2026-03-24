// Validate and normalize a raw JSON lorebook object before applying it to the store
import { DEFAULT_TYPE } from '../constants/entry-types.js';
import { createEmptyEntry } from './entry-factory.js';

/**
 * Validate and normalize a parsed JSON object into a lorebook shape.
 * Returns { ok: true, lorebook } or { ok: false, error: string }.
 */
export function importFromJson(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Not a valid JSON object.' };
  }

  const entries = Array.isArray(raw.entries) ? raw.entries : [];
  const normalizedEntries = entries.map((e) => ({
    ...createEmptyEntry(),
    name:        typeof e.name === 'string'        ? e.name        : '',
    type:        typeof e.type === 'string'        ? e.type        : DEFAULT_TYPE,
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

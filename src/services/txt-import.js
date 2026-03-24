// Parse the === block === plain-text template format into an array of entry objects
import { createEmptyEntry } from './entry-factory.js';
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

/**
 * Parse the === Name [type] === block format from a plain-text string.
 * Returns an array of entry objects.
 */
export function parseTxtToEntries(text) {
  // Split on section dividers or double-newlines before a header
  const headerPattern = /^===\s+(.+?)\s+===$/m;
  const sections = text.split(/^---$/m).map((s) => s.trim()).filter(Boolean);

  const entries = [];

  for (const section of sections) {
    const lines = section.split('\n');
    const firstLine = lines[0] ?? '';
    const headerMatch = firstLine.match(/^===\s+(.+?)\s+===$/);

    let name = '';
    let type = DEFAULT_TYPE;

    if (headerMatch) {
      const full = headerMatch[1];
      // Extract optional [type] suffix: "Entry Name [character]"
      const typeMatch = full.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
      if (typeMatch) {
        name = typeMatch[1].trim();
        const rawType = typeMatch[2].toLowerCase().replace(/\s+/g, '_');
        type = VALID_TYPES.has(rawType) ? rawType : DEFAULT_TYPE;
      } else {
        name = full;
      }
    } else {
      // Fallback: treat entire block as description
      entries.push(createEmptyEntry({ description: section }));
      continue;
    }

    // Parse triggers line
    const triggerLine = lines.find((l) => /^Triggers:/i.test(l)) ?? '';
    const triggers = triggerLine
      .replace(/^Triggers:\s*/i, '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // Everything after the triggers line is the description
    const triggerLineIdx = lines.findIndex((l) => /^Triggers:/i.test(l));
    const descStart = triggerLineIdx !== -1 ? triggerLineIdx + 1 : 1;
    const description = lines.slice(descStart).join('\n').trim();

    entries.push(createEmptyEntry({ name, type, triggers, description }));
  }

  return entries;
}

export async function readTxtFile(file) {
  return file.text();
}

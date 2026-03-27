// Parse plain-text (template or freeform) into an array of entry objects.
// Strategy A: split on --- dividers (existing template format)
// Strategy B: split on blank lines (freeform fallback when no --- or === headers found)
import { createEmptyEntry } from './entry-factory.js';
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

const TRIGGER_PREFIX = /^(Triggers|Keywords|Tags|Aliases):\s*/i;

/**
 * Parse a single text block into one entry.
 * Supports both === Name [type] === header format and freeform (first line = name).
 */
function parseBlock(block) {
  const lines = block.split('\n');

  // Find first non-empty line
  let lineIdx = 0;
  while (lineIdx < lines.length && !lines[lineIdx].trim()) lineIdx++;
  if (lineIdx >= lines.length) return null;

  const firstLine = lines[lineIdx].trim();
  let name = '';
  let type = DEFAULT_TYPE;

  // Try === Name [type] === template header
  const templateMatch = firstLine.match(/^===\s+(.+?)\s+===$/);
  if (templateMatch) {
    const full = templateMatch[1];
    const typeMatch = full.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
    if (typeMatch) {
      name = typeMatch[1].trim();
      const rawType = typeMatch[2].toLowerCase().replace(/\s+/g, '_');
      type = VALID_TYPES.has(rawType) ? rawType : DEFAULT_TYPE;
    } else {
      name = full;
    }
    lineIdx++;
  } else {
    // Freeform: first line is the name, with optional [type] suffix
    const typeMatch = firstLine.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
    if (typeMatch) {
      name = typeMatch[1].trim();
      const rawType = typeMatch[2].toLowerCase().replace(/\s+/g, '_');
      type = VALID_TYPES.has(rawType) ? rawType : DEFAULT_TYPE;
    } else {
      name = firstLine;
    }
    lineIdx++;
  }

  const remaining = lines.slice(lineIdx);

  // Scan for a trigger line (Triggers: / Keywords: / Tags: / Aliases:)
  const triggerIdx = remaining.findIndex((l) => TRIGGER_PREFIX.test(l));
  let triggers = [];
  let descLines;

  if (triggerIdx !== -1) {
    triggers = remaining[triggerIdx]
      .replace(TRIGGER_PREFIX, '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    descLines = remaining.filter((_, i) => i !== triggerIdx);
  } else {
    descLines = remaining;
  }

  const description = descLines.join('\n').trim();
  return createEmptyEntry({ name, type, triggers, description });
}

/**
 * Parse a plain-text string into an array of entry objects.
 * Tries --- splitting first; falls back to blank-line paragraph splitting
 * for freeform files that lack --- delimiters and === headers.
 */
export function parseTxtToEntries(text) {
  // Strategy A: split on --- dividers
  let sections = text.split(/^---$/m).map((s) => s.trim()).filter(Boolean);

  // Strategy B: if only one section and it has no === header, split on blank lines
  if (sections.length === 1 && !sections[0].match(/^===\s+.+?\s+===$/m)) {
    const paragraphs = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    if (paragraphs.length > 1) sections = paragraphs;
  }

  return sections.map(parseBlock).filter(Boolean);
}

export async function readTxtFile(file) {
  return file.text();
}

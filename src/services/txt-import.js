// Parse plain-text lorebook files into an array of entry objects.
// Supports three formats (detected automatically):
//   1. Labeled format: Name / Type: / Triggers: / Description: labels (e.g. DOCX exports)
//   2. Template format: === Name [type] === headers with --- dividers
//   3. Freeform fallback: blank-line paragraph splitting, first line as name
import { createEmptyEntry } from './entry-factory.js';
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

const TRIGGER_PREFIX = /^(Triggers|Keywords|Tags|Aliases):\s*/i;

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
 * Parse the labeled format: entries delimited by "Type:" anchor lines.
 * Name is the non-blank line immediately before each "Type:" line.
 * Descriptions may contain internal blank lines — blank lines are NOT used
 * as entry delimiters.
 */
function parseLabeledFormat(lines) {
  // Collect indices of all "Type: <value>" lines
  const typeIndices = [];
  lines.forEach((l, i) => {
    if (/^Type:\s*\S/i.test(l.trim())) typeIndices.push(i);
  });
  if (typeIndices.length === 0) return [];

  // For each Type: anchor, find the name line (scan backward, skip blanks)
  const nameIndices = typeIndices.map((typeIdx) => {
    let ni = typeIdx - 1;
    while (ni >= 0 && !lines[ni].trim()) ni--;
    return ni >= 0 ? ni : -1;
  });

  const entries = [];

  for (let t = 0; t < typeIndices.length; t++) {
    const typeIdx  = typeIndices[t];
    const nameIdx  = nameIndices[t];
    if (nameIdx < 0) continue;

    const name = lines[nameIdx].trim();
    const type = normalizeType(lines[typeIdx].replace(/^Type:\s*/i, '').trim());

    // Find Triggers: line (scan forward from typeIdx)
    let triggersIdx = -1;
    for (let j = typeIdx + 1; j < lines.length; j++) {
      if (TRIGGER_PREFIX.test(lines[j].trim())) { triggersIdx = j; break; }
    }
    const triggers = triggersIdx >= 0
      ? lines[triggersIdx].replace(TRIGGER_PREFIX, '').split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // Find "Description:" label line (standalone label, no value on same line)
    const searchFrom = triggersIdx >= 0 ? triggersIdx + 1 : typeIdx + 1;
    let descLabelIdx = -1;
    for (let j = searchFrom; j < lines.length; j++) {
      if (/^Description:\s*$/i.test(lines[j].trim())) { descLabelIdx = j; break; }
    }

    // Description runs from after the label to just before the next entry's name line
    const descStart = descLabelIdx >= 0 ? descLabelIdx + 1 : searchFrom;
    const descEnd   = t + 1 < nameIndices.length ? nameIndices[t + 1] : lines.length;
    const description = lines.slice(descStart, descEnd).join('\n').trim();

    entries.push(createEmptyEntry({ name, type, triggers, description }));
  }

  return entries;
}

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
 * Auto-detects format:
 *   - Labeled  (Type:/Triggers:/Description: labels) → parseLabeledFormat
 *   - Template (=== headers + --- dividers)          → parseBlock per section
 *   - Freeform (blank-line paragraphs)               → parseBlock per paragraph
 */
export function parseTxtToEntries(text) {
  const lines = text.split('\n');

  // Strategy 1: labeled format (Type: anchor lines present)
  if (lines.some((l) => /^Type:\s*\S/i.test(l.trim()))) {
    return parseLabeledFormat(lines);
  }

  // Strategy 2: --- dividers (template format)
  let sections = text.split(/^---$/m).map((s) => s.trim()).filter(Boolean);

  // Strategy 3: blank-line paragraph fallback for freeform files
  if (sections.length === 1 && !sections[0].match(/^===\s+.+?\s+===$/m)) {
    const paragraphs = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    if (paragraphs.length > 1) sections = paragraphs;
  }

  return sections.map(parseBlock).filter(Boolean);
}

export async function readTxtFile(file) {
  return file.text();
}

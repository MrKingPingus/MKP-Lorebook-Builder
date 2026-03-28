// Parse plain-text lorebook files into an array of entry objects.
// Supports four formats (detected automatically):
//   1. Entry-labeled: Entry:/Type:/Triggers:/Description: field labels
//   2. Type-anchored: bare name line + Type:/Triggers:/Description: labels (DOCX exports)
//   3. Template:  === Name [type] === headers with --- dividers
//   4. Freeform:  blank-line paragraph splitting, first line as name
import { createEmptyEntry } from './entry-factory.js';
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';

const VALID_TYPES = new Set(ENTRY_TYPES.map((t) => t.id));

const TRIGGER_PREFIX = /^(Triggers|Keywords|Tags|Aliases):\s*/i;

// When an imported entry has no recognisable type, default to Other rather than
// Character (the global DEFAULT_TYPE used for new entries in the UI).
const IMPORT_DEFAULT = 'other';

/**
 * Normalize a type string to a valid entry type id.
 * Accepts lowercase-snake ("plot_event") and PascalCase ("PlotEvent").
 * Returns IMPORT_DEFAULT for unknown/missing values.
 */
function normalizeType(raw) {
  if (typeof raw !== 'string') return IMPORT_DEFAULT;
  const snake = raw.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  return VALID_TYPES.has(snake) ? snake : IMPORT_DEFAULT;
}

/**
 * Parse the Entry:-labeled format.
 *
 * Each entry begins with an "Entry: Name" line (the entry anchor).
 * Within each entry segment the following optional field labels are recognised:
 *   Type:        → entry type (PascalCase normalised; defaults to IMPORT_DEFAULT)
 *   Triggers:    → comma-separated trigger list, each token trimmed
 *   Description: → marks the start of description content; value may appear on the
 *                  same line or on subsequent lines
 *
 * Any non-blank line that does not match a known label (before Description: is
 * encountered) is appended to the description.  Once Description: is found, all
 * remaining lines in the segment are treated as description verbatim.
 */
function parseEntryLabeledFormat(lines) {
  // Collect indices of all "Entry: <value>" anchor lines
  const entryIndices = [];
  lines.forEach((l, i) => {
    if (/^Entry:\s*/i.test(l.trim())) entryIndices.push(i);
  });
  if (entryIndices.length === 0) return [];

  const entries = [];

  for (let e = 0; e < entryIndices.length; e++) {
    const startIdx = entryIndices[e];
    const endIdx   = e + 1 < entryIndices.length ? entryIndices[e + 1] : lines.length;
    const segment  = lines.slice(startIdx, endIdx);

    // Name: value on the Entry: anchor line itself
    const name = segment[0].replace(/^Entry:\s*/i, '').trim();

    let type          = IMPORT_DEFAULT;
    let triggers      = [];
    const descParts   = [];
    let inDescription = false;

    for (let i = 1; i < segment.length; i++) {
      const line    = segment[i];
      const trimmed = line.trim();

      if (inDescription) {
        // Once Description: encountered, collect all remaining lines verbatim
        descParts.push(line);
        continue;
      }

      if (/^Type:\s*\S/i.test(trimmed)) {
        type = normalizeType(trimmed.replace(/^Type:\s*/i, '').trim());
      } else if (TRIGGER_PREFIX.test(trimmed)) {
        triggers = trimmed.replace(TRIGGER_PREFIX, '').split(',').map((s) => s.trim()).filter(Boolean);
      } else if (/^Description:/i.test(trimmed)) {
        inDescription = true;
        // Support inline value: "Description: text here"
        const inline = trimmed.replace(/^Description:\s*/i, '');
        if (inline) descParts.push(inline);
      } else if (trimmed) {
        // Unrecognised non-blank line → append to description
        descParts.push(trimmed);
      }
    }

    entries.push(createEmptyEntry({ name, type, triggers, description: descParts.join('\n').trim() }));
  }

  return entries;
}

/**
 * Parse the Type:-anchored format (e.g. DOCX exports).
 * Name is the non-blank line immediately before each "Type:" anchor.
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
    const typeIdx = typeIndices[t];
    const nameIdx = nameIndices[t];
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

    // Find "Description:" label line (standalone, no value on same line)
    const searchFrom = triggersIdx >= 0 ? triggersIdx + 1 : typeIdx + 1;
    let descLabelIdx = -1;
    for (let j = searchFrom; j < lines.length; j++) {
      if (/^Description:\s*$/i.test(lines[j].trim())) { descLabelIdx = j; break; }
    }

    // Description runs from after the label to just before the next entry's name line
    const descStart   = descLabelIdx >= 0 ? descLabelIdx + 1 : searchFrom;
    const descEnd     = t + 1 < nameIndices.length ? nameIndices[t + 1] : lines.length;
    const description = lines.slice(descStart, descEnd).join('\n').trim();

    entries.push(createEmptyEntry({ name, type, triggers, description }));
  }

  return entries;
}

/**
 * Parse a single text block into one entry.
 * Supports both === Name [type] === header format and freeform (first line = name).
 * Uses the global DEFAULT_TYPE ('character') to preserve existing behaviour.
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
 * Auto-detects format in priority order:
 *   1. Entry-labeled  (Entry: anchors present)
 *   2. Type-anchored  (Type: anchors present, no Entry: labels)
 *   3. Template       (--- dividers + === headers)
 *   4. Freeform       (blank-line paragraph fallback)
 */
export function parseTxtToEntries(text) {
  const lines = text.split('\n');

  if (lines.some((l) => /^Entry:\s*/i.test(l.trim()))) {
    return parseEntryLabeledFormat(lines);
  }

  if (lines.some((l) => /^Type:\s*\S/i.test(l.trim()))) {
    return parseLabeledFormat(lines);
  }

  // Template / freeform paths
  let sections = text.split(/^---$/m).map((s) => s.trim()).filter(Boolean);

  if (sections.length === 1 && !sections[0].match(/^===\s+.+?\s+===$/m)) {
    const paragraphs = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    if (paragraphs.length > 1) sections = paragraphs;
  }

  return sections.map(parseBlock).filter(Boolean);
}

export async function readTxtFile(file) {
  return file.text();
}

// Parse plain-text lorebook files into an array of entry objects.
// Supports five formats (detected automatically):
//   0. CharSnap page copy: text selected and copied off a CharSnap lorebook page
//   1. Entry-labeled: Entry:/Type:/Triggers:/Description: field labels
//   2. Type-anchored: bare name line + Type:/Triggers:/Description: labels (DOCX exports)
//   3. Template:  === Name [type] === headers with --- dividers
//   4. Freeform:  blank-line paragraph splitting, first line as name
import { createEmptyEntry } from './entry-factory.js';
import { unescapeImportedEntry } from './unescape-import.js';
import { ENTRY_TYPES, DEFAULT_TYPE } from '../constants/entry-types.js';
import { MAX_TRIGGERS, PAGE_TRIGGER_LINE_MAX } from '../constants/limits.js';

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

// ── CharSnap page copy (#121) ───────────────────────────────────────────────
// What you get by selecting a lorebook on CharSnap and copying it, pasted
// straight in or by way of a Word document. No labels and no dividers; each
// entry is a short header, its description, then one trigger per line:
//
//   Gummi Ship            ← name
//   Character             ← type, alone on its line
//   Public                ← visibility, alone on its line. Some copies lack it.
//   The Gummi Ship is…    ← description (any number of paragraphs)
//
//   Triggers:
//   gummi
//   ship
//   Trigger Condition:    ← optional
//   When traveling to other worlds.
//   Nobody                ← the next entry's name follows straight on
//
// The header is the only structure there is, so it is the anchor. It has to
// be tried before the labelled formats, because a description may hold a line
// like "Type: Method of travel", which the Type-anchored parser takes as a
// label. Blank lines carry no structure here: a Word document puts one between
// every line, a browser paste only between paragraphs.
//
// With the visibility line a header is three lines and cannot be mistaken.
// Without it, a header is just a name over a type word, and a trigger that
// happens to be a type word ("Item") makes the trigger above it look like a
// name. Two things settle that: the type must be spelled as CharSnap labels
// it, capital and all, and where two candidates sit in one trigger list the
// later one wins, since triggers come before the next entry's name and never
// after it.
const PAGE_TYPES = new Map(ENTRY_TYPES.map((t) => [t.label.toLowerCase(), t.id]));
PAGE_TYPES.set('plot event', 'plot_event');
const PAGE_TYPE_LABELS    = new Set([...ENTRY_TYPES.map((t) => t.label), 'Plot Event']);
const PAGE_VISIBILITY     = /^(public|private)$/i;
const PAGE_TRIGGERS_LABEL = /^Triggers:\s*(.*)$/i;
const PAGE_CONDITION_LABEL = /^Trigger Condition:\s*(.*)$/i;

/** The page's structure, read off its non-blank lines. `at` maps back to `lines`. */
function pageRows(lines) {
  const rows = [];
  lines.forEach((raw, at) => { if (raw.trim() !== '') rows.push({ text: raw.trim(), at }); });
  return rows;
}

const hasVisibilityAt = (rows, k) => k + 2 < rows.length && PAGE_VISIBILITY.test(rows[k + 2].text);

/** A three-line header: name, type in any case, Public/Private. */
function isStrongHeaderAt(rows, k) {
  return k + 2 < rows.length && PAGE_TYPES.has(rows[k + 1].text.toLowerCase()) && hasVisibilityAt(rows, k);
}

/** A two-line header: name, then a type spelled exactly as CharSnap labels it. */
function isWeakHeaderAt(rows, k) {
  return k + 1 < rows.length && PAGE_TYPE_LABELS.has(rows[k + 1].text);
}

/** True when the text opens with a CharSnap page header. */
function looksLikeCharSnapPage(lines) {
  const rows = pageRows(lines);
  if (rows.length < 2) return false;
  if (isStrongHeaderAt(rows, 0)) return true;
  // Without the visibility line, a name over a type word is thin evidence on
  // its own, so the page's other fixed line has to be there too.
  return isWeakHeaderAt(rows, 0) && rows.some((r) => /^Triggers:\s*$/i.test(r.text));
}

function parseCharSnapPage(lines) {
  const rows   = pageRows(lines);
  const strong = isStrongHeaderAt(rows, 0);
  const findFrom = (from, to, test) => {
    for (let k = from; k < to; k++) if (test(k)) return k;
    return -1;
  };
  const isTriggersLabel  = (k) => PAGE_TRIGGERS_LABEL.test(rows[k].text) && !PAGE_CONDITION_LABEL.test(rows[k].text);
  const isConditionLabel = (k) => PAGE_CONDITION_LABEL.test(rows[k].text);

  /** Where the next entry's header is, looking from row `from`; rows.length if none. */
  function nextHeader(from, conditionAt) {
    if (strong) {
      const k = findFrom(from, rows.length, (i) => isStrongHeaderAt(rows, i));
      return k === -1 ? rows.length : k;
    }
    // The next entry ends at its own Triggers: line, so a header for it has
    // to sit before that.
    const until = (() => {
      const k = findFrom(from, rows.length, isTriggersLabel);
      return k === -1 ? rows.length : k;
    })();
    if (conditionAt !== -1) {
      // After a condition: its text is at least one line, then the header.
      const k = findFrom(conditionAt + 2, until, (i) => isWeakHeaderAt(rows, i));
      if (k !== -1) return k;
      const bare = findFrom(conditionAt + 1, until, (i) => isWeakHeaderAt(rows, i));
      return bare === -1 ? rows.length : bare;
    }
    // In a trigger list: every line up to the header is a trigger, so it is
    // short. The first long line is description, which puts the header before
    // it; of the candidates before it, the last is the header.
    const firstLong = findFrom(from, until, (i) => rows[i].text.length > PAGE_TRIGGER_LINE_MAX);
    const limit = firstLong === -1 ? until : firstLong;
    let found = -1;
    for (let k = from; k < limit; k++) if (isWeakHeaderAt(rows, k) && k + 1 < until) found = k;
    return found === -1 ? rows.length : found;
  }

  const entries = [];
  let pos = 0;
  while (pos < rows.length) {
    const name = rows[pos].text;
    const type = PAGE_TYPES.get(rows[pos + 1].text.toLowerCase());
    const withVisibility = strong || (hasVisibilityAt(rows, pos) && isStrongHeaderAt(rows, pos));
    const isPublic = withVisibility ? rows[pos + 2].text.toLowerCase() === 'public' : false;
    const bodyFrom = pos + (withVisibility ? 3 : 2);

    // The description runs to the Triggers: line. An entry may have none
    // (a condition or Always on can stand in for triggers), in which case it
    // runs to the condition, or to the next header that cannot be mistaken.
    const strongNext = findFrom(bodyFrom, rows.length, (i) => isStrongHeaderAt(rows, i));
    const bodyEnd    = strong && strongNext !== -1 ? strongNext : rows.length;
    const triggersAt = findFrom(bodyFrom, bodyEnd, isTriggersLabel);
    const firstCondition = findFrom(bodyFrom, bodyEnd, isConditionLabel);
    const descEnd = triggersAt !== -1 ? triggersAt : (firstCondition !== -1 ? firstCondition : bodyEnd);

    const listFrom    = triggersAt !== -1 ? triggersAt + 1 : descEnd;
    const conditionAt = (() => {
      const stop = (() => {
        const k = findFrom(listFrom, rows.length, isTriggersLabel);
        return k === -1 ? bodyEnd : Math.min(k, bodyEnd);
      })();
      return findFrom(descEnd, stop, isConditionLabel);
    })();
    const next = triggersAt === -1 && conditionAt === -1 ? bodyEnd : nextHeader(listFrom, conditionAt);

    const triggers = [];
    if (triggersAt !== -1) {
      // "Triggers: a, b" on one line, should a page ever render them so.
      const inline = rows[triggersAt].text.match(PAGE_TRIGGERS_LABEL)[1];
      triggers.push(...inline.split(',').map((t) => t.trim()).filter(Boolean));
      const listEnd = conditionAt !== -1 ? conditionAt : next;
      for (let k = triggersAt + 1; k < listEnd; k++) triggers.push(rows[k].text);
    }

    const condition = [];
    if (conditionAt !== -1) {
      const inline = rows[conditionAt].text.match(PAGE_CONDITION_LABEL)[1];
      if (inline) condition.push(inline);
      for (let k = conditionAt + 1; k < next; k++) condition.push(rows[k].text);
    }

    // The description keeps the page's own line breaks, from the raw lines.
    const rawFrom = bodyFrom < rows.length ? rows[bodyFrom].at : lines.length;
    const rawTo   = descEnd < rows.length ? rows[descEnd].at : lines.length;
    const description = bodyFrom < descEnd
      ? lines.slice(rawFrom, rawTo).map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim()
      : '';

    entries.push(createEmptyEntry({
      name, type, isPublic, triggers, description,
      triggerCondition: condition.join(' '),
    }));
    pos = next;
    // A header needs a type line under it; a stray last line is not an entry.
    if (pos + 1 >= rows.length) break;
  }
  return entries;
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
 * Parse the markdown-bold-label format used by AI-generated lorebook text.
 *
 * Each entry begins with a "**Entry Name:** Name" anchor line.
 * Lines before the first anchor (AI preamble text) are silently skipped.
 * Recognised field labels (after stripping ** markers):
 *   Entry Type:  → entry type
 *   Triggers:    → comma-separated trigger list
 *   Description: → marks start of description content
 */
function parseMarkdownBoldFormat(lines) {
  const entryIndices = [];
  lines.forEach((l, i) => {
    if (/^\*\*Entry Name:\*\*\s+\S/i.test(l.trim())) entryIndices.push(i);
  });
  if (entryIndices.length === 0) return [];

  const entries = [];
  for (let e = 0; e < entryIndices.length; e++) {
    const segment = lines.slice(entryIndices[e], e + 1 < entryIndices.length ? entryIndices[e + 1] : lines.length);
    const name    = segment[0].replace(/^\*\*Entry Name:\*\*\s*/i, '').replace(/\*\*/g, '').trim();

    let type = IMPORT_DEFAULT, triggers = [];
    const descParts = [];
    let inDescription = false;

    for (let i = 1; i < segment.length; i++) {
      const raw      = segment[i];
      const stripped = raw.replace(/\*\*/g, '').trim();
      if (inDescription) { descParts.push(raw); continue; }
      if      (/^Entry Type:\s*\S/i.test(stripped)) { type = normalizeType(stripped.replace(/^Entry Type:\s*/i, '').trim()); }
      else if (TRIGGER_PREFIX.test(stripped))        { triggers = stripped.replace(TRIGGER_PREFIX, '').split(',').map((s) => s.trim()).filter(Boolean); }
      else if (/^Description:\s*/i.test(stripped))  { inDescription = true; const inline = stripped.replace(/^Description:\s*/i, ''); if (inline) descParts.push(inline); }
      else if (stripped)                             { descParts.push(stripped); }
    }
    entries.push(createEmptyEntry({ name, type, triggers, description: descParts.join('\n').trim() }));
  }
  return entries;
}

/**
 * Parse a plain-text string into an array of entry objects.
 * Auto-detects format in priority order:
 *   1. Markdown-bold-label (**Entry Name:** / **Entry Type:** / etc.)
 *   2. Entry-labeled  (Entry: anchors present)
 *   3. Type-anchored  (Type: anchors present, no Entry: labels)
 *   4. Template       (--- dividers + === headers)
 *   5. Freeform       (blank-line paragraph fallback)
 */
export function parseTxtToEntries(text) {
  const lines = text.split('\n');

  let entries;
  if (looksLikeCharSnapPage(lines)) {
    entries = parseCharSnapPage(lines);
  } else if (lines.some((l) => /^\*\*Entry Name:\*\*/i.test(l.trim()))) {
    entries = parseMarkdownBoldFormat(lines);
  } else if (lines.some((l) => /^Entry:\s*/i.test(l.trim()))) {
    entries = parseEntryLabeledFormat(lines);
  } else if (lines.some((l) => /^Type:\s*\S/i.test(l.trim()))) {
    entries = parseLabeledFormat(lines);
  } else {
    // Template / freeform paths
    let sections = text.split(/^---$/m).map((s) => s.trim()).filter(Boolean);

    if (sections.length === 1 && !sections[0].match(/^===\s+.+?\s+===$/m)) {
      const paragraphs = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
      if (paragraphs.length > 1) sections = paragraphs;
    }

    entries = sections.map(parseBlock).filter(Boolean);
  }

  // Post-process: strip spurious escape backslashes (`World\'s` → `World's`, etc.)
  // and cap triggers at MAX_TRIGGERS, the same as the JSON importer does.
  return entries
    .map(unescapeImportedEntry)
    .map((e) => ({ ...e, triggers: (e.triggers ?? []).slice(0, MAX_TRIGGERS) }));
}

export async function readTxtFile(file) {
  return file.text();
}

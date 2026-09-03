// Dynamically import Mammoth.js from the bundle, parse the .docx structure (headings +
// paragraphs), and build entries from it. Falls back to raw-text + txt-import for
// unstructured docs. Mammoth is code-split rather than CDN-loaded so Word import works
// offline and the deployment runs no third-party JavaScript.
import { parseTxtToEntries } from './txt-import.js';
import { createEmptyEntry } from './entry-factory.js';
import { unescapeImportedEntry } from './unescape-import.js';
import { ENTRY_TYPES } from '../constants/entry-types.js';
import { MAX_TRIGGERS } from '../constants/limits.js';

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const TRIGGER_LABEL = /^(Triggers|Keywords|Tags|Aliases):\s*/i;
// Single-word paragraphs whose text matches an entry-type label become the entry's type
// (e.g. a bare "Other" paragraph between a title and the description).
const TYPE_BY_LABEL = new Map(ENTRY_TYPES.map((t) => [t.label.toLowerCase(), t.id]));

let mammothPromise = null;

function loadMammoth() {
  if (mammothPromise) return mammothPromise;
  mammothPromise = import('mammoth').then((mod) => mod.default ?? mod);
  return mammothPromise;
}

/**
 * True when a <p> element's entire visible text is wrapped in <strong>/<b>.
 * Catches docs where titles were bolded by hand (e.g. pasted from chat tools)
 * rather than tagged with a Heading style.
 */
function isBoldOnlyParagraph(p) {
  const text = (p.textContent || '').trim();
  if (!text) return false;
  const bolds = p.querySelectorAll('strong, b');
  if (bolds.length === 0) return false;
  const boldText = Array.from(bolds).map((b) => (b.textContent || '')).join('').trim();
  return boldText === text;
}

/**
 * Walk mammoth's HTML output and emit one entry per heading/bold-title boundary.
 *
 * Within a single entry:
 *   - A "Triggers:" / "Keywords:" / "Tags:" / "Aliases:" paragraph flips the
 *     parser into trigger-collection mode for the rest of the entry.
 *     Inline values on the label line are accepted ("Triggers: a, b, c"), and
 *     each subsequent paragraph contributes one or more triggers (commas still
 *     split a paragraph if present).
 *   - A short paragraph whose text matches an entry-type label (e.g. "Other")
 *     and that appears before any description content sets the entry's type.
 *   - Everything else accumulates into the description.
 *
 * Returns [] for documents with no heading/bold structure so the caller can
 * fall back to the raw-text parser.
 */
function parseHtmlToEntries(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = Array.from(doc.body.children);

  const entries = [];
  let current = null;
  let collectingTriggers = false;

  const finalize = () => {
    if (current && current.name) {
      entries.push(createEmptyEntry({
        name:        current.name,
        type:        current.type ?? 'other',
        // Same cap as the JSON and TXT importers.
        triggers:    current.triggers.slice(0, MAX_TRIGGERS),
        description: current.descLines.join('\n').trim(),
      }));
    }
    current = null;
    collectingTriggers = false;
  };

  for (const el of blocks) {
    const text = (el.textContent || '').trim();

    const isTitle = HEADING_TAGS.has(el.tagName) ||
      (el.tagName === 'P' && isBoldOnlyParagraph(el));

    if (isTitle) {
      finalize();
      current = { name: text, type: undefined, triggers: [], descLines: [] };
      continue;
    }

    if (!current || !text) continue;

    if (TRIGGER_LABEL.test(text)) {
      const inline = text.replace(TRIGGER_LABEL, '').trim();
      if (inline) {
        current.triggers.push(...inline.split(',').map((s) => s.trim()).filter(Boolean));
      }
      collectingTriggers = true;
      continue;
    }

    if (collectingTriggers) {
      current.triggers.push(...text.split(',').map((s) => s.trim()).filter(Boolean));
      continue;
    }

    // A standalone paragraph whose entire text matches a known entry-type
    // label (e.g. a bare "Other") sets the type once instead of polluting
    // the description. Stray non-type metadata (checkbox glyphs, "Private",
    // etc.) still falls through to the description.
    if (current.type === undefined) {
      const typeId = TYPE_BY_LABEL.get(text.toLowerCase());
      if (typeId) {
        current.type = typeId;
        continue;
      }
    }

    current.descLines.push(text);
  }

  finalize();
  return entries.map(unescapeImportedEntry);
}

export async function importFromDocx(file) {
  const mammoth = await loadMammoth();
  const arrayBuffer = await file.arrayBuffer();

  const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
  const htmlEntries = parseHtmlToEntries(htmlResult.value);
  if (htmlEntries.length > 0) return htmlEntries;

  // Fallback: no headings or bold-only titles in the doc — let the txt parser try.
  const textResult = await mammoth.extractRawText({ arrayBuffer });
  return parseTxtToEntries(textResult.value);
}

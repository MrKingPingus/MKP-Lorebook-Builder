// Read an OpenDocument text file (.odt, from LibreOffice or OpenOffice) into
// entries.
//
// An .odt is a zip; the document's text is in content.xml as <text:p>
// paragraphs and <text:h> headings. They are read in order, one per line with
// a blank line between, which is the same shape the Word importer hands to the
// text parser, so every format txt-import.js understands works here too: the
// labelled formats, freeform paragraphs, and text copied off a CharSnap page.
import { readZip } from './zip-reader.js';
import { parseTxtToEntries } from './txt-import.js';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** The paragraphs of an ODF content.xml, in document order, as plain text. */
export function odtParagraphs(xml) {
  const body = String(xml ?? '')
    // Keep only the document body: styles and settings have no text.
    .replace(/^[\s\S]*?<office:text\b[^>]*>/, '')
    .replace(/<\/office:text>[\s\S]*$/, '')
    // ODF compresses runs of spaces into <text:s text:c="n"/>.
    .replace(/<text:s\s+text:c="(\d+)"\s*\/>/g, (_, n) => ' '.repeat(Number(n)))
    .replace(/<text:s\s*\/>/g, ' ')
    .replace(/<text:tab\s*\/>/g, '\t')
    .replace(/<text:line-break\s*\/>/g, '\n');

  const out = [];
  const para = /<text:(p|h)\b[^>]*?(\/>|>([\s\S]*?)<\/text:\1>)/g;
  let m;
  while ((m = para.exec(body)) !== null) {
    const inner = m[3] ?? '';
    out.push(decodeEntities(inner.replace(/<[^>]+>/g, '')));
  }
  return out;
}

export async function importFromOdt(file) {
  const files = await readZip(await file.arrayBuffer());
  const content = files.find((f) => f.name === 'content.xml');
  if (!content) throw new Error('That file is not an OpenDocument text file (.odt).');
  const text = odtParagraphs(new TextDecoder().decode(content.data)).join('\n\n');
  return parseTxtToEntries(text);
}

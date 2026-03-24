// Build a minimal OOXML-compliant .docx Blob by delegating ZIP assembly to zip-builder
import { buildZip } from './zip-builder.js';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDocumentXml(lorebook) {
  const paragraphs = [];

  for (const entry of lorebook.entries) {
    // Entry heading
    paragraphs.push(
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>` +
      `<w:r><w:t>${escapeXml(entry.name || '(unnamed)')}</w:t></w:r></w:p>`
    );

    // Type
    paragraphs.push(
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Type: </w:t></w:r>` +
      `<w:r><w:t>${escapeXml(entry.type)}</w:t></w:r></w:p>`
    );

    // Triggers
    paragraphs.push(
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Triggers: </w:t></w:r>` +
      `<w:r><w:t>${escapeXml(entry.triggers.join(', '))}</w:t></w:r></w:p>`
    );

    // Description paragraphs
    const descLines = (entry.description || '').split('\n');
    for (const line of descLines) {
      paragraphs.push(
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
      );
    }

    // Spacer
    paragraphs.push(`<w:p/>`);
  }

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`,
    `<w:body>`,
    ...paragraphs,
    `</w:body>`,
    `</w:document>`,
  ].join('\n');
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

const WORD_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`;

export function exportToDocxBlob(lorebook) {
  const files = [
    { name: '[Content_Types].xml',          data: CONTENT_TYPES_XML },
    { name: '_rels/.rels',                  data: RELS_XML },
    { name: 'word/_rels/document.xml.rels', data: WORD_RELS_XML },
    { name: 'word/document.xml',            data: buildDocumentXml(lorebook) },
  ];
  return buildZip(files);
}

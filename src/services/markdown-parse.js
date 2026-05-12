// Hand-rolled markdown → AST parser for bundled docs and the CHANGELOG.
// Pure JS, no React imports — components render the AST into JSX themselves
// (see MarkdownView.jsx). Covers the subset we actually emit:
//   - headings: `# h1`, `## h2`, `### h3`
//   - paragraphs (blank-line separated)
//   - lists: ul `-` / `*`, ol `1.`
//   - inline: **bold**, *italic*, `code`, [text](url)
//   - horizontal rules: ---
// No HTML pass-through, no nested lists, no tables — keep it small and predictable.
//
// AST shape:
//   block ::= { type: 'h1'|'h2'|'h3'|'p',  inline: span[] }
//           | { type: 'ul'|'ol', items: span[][] }
//           | { type: 'hr' }
//   span  ::= { type: 'text'|'bold'|'italic'|'code'|'link', text?, url?, children? }

/** Parse an inline span into an array of inline nodes. */
function parseInline(text) {
  const nodes = [];
  let buf = '';
  let i = 0;
  const pushBuf = () => {
    if (buf) { nodes.push({ type: 'text', text: buf }); buf = ''; }
  };

  while (i < text.length) {
    const ch = text[i];

    // Inline code: `code`
    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        pushBuf();
        nodes.push({ type: 'code', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // Bold: **bold**
    if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        pushBuf();
        nodes.push({ type: 'bold', children: parseInline(text.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    // Italic: *italic* (single asterisk, not part of a **)
    if (ch === '*' && text[i + 1] !== '*' && text[i - 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && text[end + 1] !== '*') {
        pushBuf();
        nodes.push({ type: 'italic', children: parseInline(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }

    // Link: [text](url)
    if (ch === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(i + 1, closeBracket);
          const url   = text.slice(closeBracket + 2, closeParen);
          pushBuf();
          nodes.push({ type: 'link', url, children: parseInline(label) });
          i = closeParen + 1;
          continue;
        }
      }
    }

    buf += ch;
    i++;
  }
  pushBuf();
  return nodes;
}

/** Parse a markdown source string into a block AST. */
export function parseMarkdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      blocks.push({ type: `h${level}`, inline: parseInline(h[2]) });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[-*]\s+/, '')));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\d+\.\s+/, '')));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^---+\s*$/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', inline: parseInline(paraLines.join(' ')) });
  }

  return blocks;
}

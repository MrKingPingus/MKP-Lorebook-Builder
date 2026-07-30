// Renders the AST from services/markdown-parse.js into React nodes.
//
// The parser's header has always pointed at this file; until now the renderer
// lived inline in Lander.jsx, which was fine while the lander was the only
// thing showing bundled markdown. The update notice shows the changelog too, so
// it moved here rather than being copy-pasted.
//
// Takes either raw markdown (`source`) or an already-parsed block array
// (`blocks`) — the update notice slices the AST to a single release before
// rendering, so it has blocks rather than a string.
import { Fragment } from 'react';
import { parseMarkdown } from '../../services/markdown-parse.js';

function renderInline(spans, keyPrefix) {
  return spans.map((s, idx) => {
    const k = `${keyPrefix}-${idx}`;
    if (s.type === 'text')   return <Fragment key={k}>{s.text}</Fragment>;
    if (s.type === 'code')   return <code key={k} className="md-code">{s.text}</code>;
    if (s.type === 'bold')   return <strong key={k}>{renderInline(s.children, k)}</strong>;
    if (s.type === 'italic') return <em key={k}>{renderInline(s.children, k)}</em>;
    if (s.type === 'link')   return (
      <a key={k} href={s.url} target="_blank" rel="noreferrer" className="md-link">
        {renderInline(s.children, k)}
      </a>
    );
    return null;
  });
}

function renderBlocks(blocks) {
  return blocks.map((b, idx) => {
    const k = `md-${idx}`;
    if (b.type === 'hr') return <hr key={k} className="md-hr" />;
    if (b.type === 'h1') return <h1 key={k} className="md-h1">{renderInline(b.inline, k)}</h1>;
    if (b.type === 'h2') return <h2 key={k} className="md-h2">{renderInline(b.inline, k)}</h2>;
    if (b.type === 'h3') return <h3 key={k} className="md-h3">{renderInline(b.inline, k)}</h3>;
    if (b.type === 'p')  return <p  key={k} className="md-p">{renderInline(b.inline, k)}</p>;
    if (b.type === 'ul' || b.type === 'ol') {
      const Tag = b.type;
      return (
        <Tag key={k} className={`md-${b.type}`}>
          {b.items.map((item, j) => (
            <li key={`${k}-li${j}`}>{renderInline(item, `${k}-li${j}`)}</li>
          ))}
        </Tag>
      );
    }
    return null;
  });
}

export function MarkdownView({ source, blocks }) {
  return <>{renderBlocks(blocks ?? parseMarkdown(source ?? ''))}</>;
}

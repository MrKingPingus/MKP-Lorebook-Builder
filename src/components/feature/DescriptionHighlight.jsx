// Read-only overlay rendered behind the description textarea (the textarea's
// text is transparent, so this layer is what the user actually sees). Carries
// two kinds of decoration:
//   - search-mark: yellow background highlight on the active search query
//   - diff-overlay-add: green outline around words that are present in this
//     entry's description but absent in its reference counterpart, when
//     compare mode is engaged on this entry. 'del' segments don't appear in
//     the active text at all — those live on the reference card.
import { useMemo } from 'react';
import { useHtmlEscape } from '../../hooks/use-html-escape.js';

export function DescriptionHighlight({ text, query, diffSegments = null }) {
  const { escapeHtml, escapeRegex } = useHtmlEscape();

  const html = useMemo(() => {
    // Helper: apply the search-mark wrap to a chunk of already-escaped text.
    function withSearchMarks(escaped) {
      if (!query) return escaped;
      return escaped.replace(
        new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'gi'),
        '<mark class="search-mark">$1</mark>',
      );
    }

    // Compare mode: walk the diff segments and emit add-outlines around
    // 'add' chunks. 'same' renders plain; 'del' is dropped (not in active).
    if (diffSegments && diffSegments.length > 0) {
      let out = '';
      for (const seg of diffSegments) {
        if (seg.kind === 'del') continue;
        const inner = withSearchMarks(escapeHtml(seg.text));
        if (seg.kind === 'add') out += `<span class="diff-overlay-add">${inner}</span>`;
        else                    out += inner;
      }
      return out;
    }

    return withSearchMarks(escapeHtml(text));
  }, [text, query, diffSegments]);

  return (
    <div
      className="description-highlight"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html + '\n' }}
    />
  );
}

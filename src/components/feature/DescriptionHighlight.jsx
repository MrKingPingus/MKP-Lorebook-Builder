// Read-only overlay rendered behind the description textarea (the textarea's
// text is transparent, so this layer is what the user actually sees). Carries
// two kinds of decoration:
//   - search-mark: yellow background highlight on the active search query
//   - diff outline boxes when compare mode is engaged. Box colour and
//     direction depend on which side this overlay is rendering for:
//       diffSide='active'    — show 'add' segments in green outlines
//                              (text in active that's not in reference);
//                              'del' segments are dropped
//       diffSide='reference' — show 'del' segments in red outlines
//                              (text in reference that's not in active);
//                              'add' segments are dropped
//
// Concatenating same+add reconstructs the active text; same+del
// reconstructs the reference text — both overlays line up with their
// underlying textareas without any text shifting.
import { useMemo } from 'react';
import { useHtmlEscape } from '../../hooks/use-html-escape.js';

export function DescriptionHighlight({ text, query, diffSegments = null, diffSide = 'active' }) {
  const { escapeHtml, escapeRegex } = useHtmlEscape();

  const html = useMemo(() => {
    function withSearchMarks(escaped) {
      if (!query) return escaped;
      return escaped.replace(
        new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'gi'),
        '<mark class="search-mark">$1</mark>',
      );
    }

    if (diffSegments && diffSegments.length > 0) {
      const skipKind = diffSide === 'reference' ? 'add' : 'del';
      const markKind = diffSide === 'reference' ? 'del' : 'add';
      const markClass = diffSide === 'reference' ? 'diff-overlay-del' : 'diff-overlay-add';
      let out = '';
      for (const seg of diffSegments) {
        if (seg.kind === skipKind) continue;
        const inner = withSearchMarks(escapeHtml(seg.text));
        if (seg.kind === markKind) out += `<span class="${markClass}">${inner}</span>`;
        else                       out += inner;
      }
      return out;
    }

    return withSearchMarks(escapeHtml(text));
  }, [text, query, diffSegments, diffSide]);

  return (
    <div
      className="description-highlight"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html + '\n' }}
    />
  );
}

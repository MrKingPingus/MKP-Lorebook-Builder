// Yellow search-match highlight overlay rendered over the description textarea content
import { useMemo } from 'react';
import { useHtmlEscape } from '../../hooks/use-html-escape.js';

export function DescriptionHighlight({ text, query, style }) {
  const { escapeHtml, escapeRegex } = useHtmlEscape();
  const html = useMemo(() => {
    if (!query) return escapeHtml(text);
    return escapeHtml(text).replace(
      new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'gi'),
      '<mark class="search-mark">$1</mark>'
    );
  }, [text, query]);

  return (
    <div
      className="description-highlight"
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html + '\n' }}
    />
  );
}

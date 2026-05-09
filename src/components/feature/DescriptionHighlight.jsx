// Read-only overlay rendered behind the description textarea (the textarea's
// text is transparent, so this layer is what the user actually sees). Carries
// two kinds of decoration:
//
//   - search-mark: yellow background highlight on the active search query.
//
//   - diff outline boxes (compare mode). Inline <span class="diff-overlay-*">
//     markers are inserted around segments of the diff in the rendered text,
//     then a layout effect measures each marker's bounding rect (which spans
//     all wrapped lines as one rectangle) and renders absolutely-positioned
//     outline divs in a sibling layer. This avoids the CSS line-slicing
//     behaviour that would otherwise turn a multi-line change into N broken
//     boxes — instead, each change reads as one continuous shape.
//
// `diffSide` selects which side this overlay is rendering for:
//     'active'    — show 'add' segments (text in active that's not in
//                   reference); 'del' segments are dropped
//     'reference' — show 'del' segments (text in reference that's not in
//                   active); 'add' segments are dropped
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useHtmlEscape } from '../../hooks/use-html-escape.js';

export function DescriptionHighlight({ text, query, diffSegments = null, diffSide = 'active' }) {
  const { escapeHtml, escapeRegex } = useHtmlEscape();
  const overlayRef               = useRef(null);
  const [outlineRects, setRects] = useState([]);

  const html = useMemo(() => {
    function withSearchMarks(escaped) {
      if (!query) return escaped;
      return escaped.replace(
        new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'gi'),
        '<mark class="search-mark">$1</mark>',
      );
    }

    if (diffSegments && diffSegments.length > 0) {
      const skipKind  = diffSide === 'reference' ? 'add' : 'del';
      const markKind  = diffSide === 'reference' ? 'del' : 'add';
      const markClass = diffSide === 'reference' ? 'diff-overlay-del' : 'diff-overlay-add';
      let out = '';
      for (const seg of diffSegments) {
        if (seg.kind === skipKind) continue;
        if (seg.kind === markKind) {
          // Strip leading/trailing whitespace from the marker span — emit
          // it as plain text outside the <span> instead. Keeps the rendered
          // text identical while preventing trailing whitespace that wraps
          // onto the next visual line from extending the marker's measured
          // rects into a region that contains no diff content.
          const m     = seg.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
          const lead  = m ? m[1] : '';
          const core  = m ? m[2] : seg.text;
          const trail = m ? m[3] : '';
          if (lead)  out += escapeHtml(lead);
          if (core.length > 0) {
            out += `<span class="${markClass}">${withSearchMarks(escapeHtml(core))}</span>`;
          }
          if (trail) out += escapeHtml(trail);
        } else {
          out += withSearchMarks(escapeHtml(seg.text));
        }
      }
      return out;
    }

    return withSearchMarks(escapeHtml(text));
  }, [text, query, diffSegments, diffSide]);

  // Measure each diff marker's bounding rect (single-line spans hug the
  // words; multi-line spans return the full bounding box covering both
  // lines as one rect — the desired single-shape behaviour). Re-runs on
  // text/segment change and on width changes that re-wrap the content.
  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    if (!diffSegments || diffSegments.length === 0) {
      setRects((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const className = diffSide === 'reference' ? 'diff-overlay-del' : 'diff-overlay-add';

    function measure() {
      const el = overlayRef.current;
      if (!el) return;
      const wrapper = el.getBoundingClientRect();
      const spans   = el.querySelectorAll(`.${className}`);
      const next    = [];
      spans.forEach((span) => {
        // getClientRects returns one rect per visual line a span wraps onto,
        // so each rect is tight on the diff text for that line — avoids the
        // bounding-box behaviour that would extend across non-diff content
        // on partial first/last lines.
        const rects = span.getClientRects();
        for (let i = 0; i < rects.length; i++) {
          const r = rects[i];
          // Drop near-zero rects (browsers occasionally report a sliver at
          // the wrap point even with whitespace stripped from the marker).
          if (r.width < 4 || r.height < 4) continue;
          next.push({
            left:   r.left - wrapper.left,
            top:    r.top  - wrapper.top,
            width:  r.width,
            height: r.height,
          });
        }
      });
      setRects((prev) => {
        if (prev.length !== next.length) return next;
        for (let i = 0; i < next.length; i++) {
          const a = prev[i];
          const b = next[i];
          if (a.left !== b.left || a.top !== b.top || a.width !== b.width || a.height !== b.height) {
            return next;
          }
        }
        return prev;
      });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(overlay);
    return () => ro.disconnect();
  }, [text, diffSegments, diffSide, html]);

  // If a custom font swap-in changes wrap points after the initial paint,
  // fonts.ready settles to a Promise that resolves once all loads finish.
  useEffect(() => {
    if (!document.fonts || !document.fonts.ready) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      // Trigger a re-measure by reading layout — the ResizeObserver fires if
      // anything actually changed.
      // eslint-disable-next-line no-unused-expressions
      overlay.offsetHeight;
    });
    return () => { cancelled = true; };
  }, [diffSide]);

  const outlineClass = diffSide === 'reference' ? 'diff-outline diff-outline--del' : 'diff-outline diff-outline--add';

  return (
    <>
      <div
        ref={overlayRef}
        className="description-highlight"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: html + '\n' }}
      />
      {outlineRects.length > 0 && (
        <div className="diff-outline-layer" aria-hidden="true">
          {outlineRects.map((r, i) => (
            <div
              key={i}
              className={outlineClass}
              style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
            />
          ))}
        </div>
      )}
    </>
  );
}

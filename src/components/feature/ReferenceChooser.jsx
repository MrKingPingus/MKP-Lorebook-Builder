// The reference chooser — the one surface that pairs a lorebook as reference.
//
// Opened from three places (see use-reference-chooser.js) and rendered once, at
// the app root, so it is never clipped by whichever thing opened it.
//
// It leads with a sentence explaining what a reference lorebook *is*. That is
// deliberate and is the lesson of #123: pairing was previously a `⇄` glyph and
// a checkbox in two different panels, and the first person to see the glyph —
// the person who specified the feature — did not read it as "choose a reference
// book". The moment someone opens this panel is the moment they are asking the
// question, so this is where the answer goes rather than in a settings hint
// they will never scroll to.
import { createPortal }          from 'react-dom';
import { useReferenceChooser }   from '../../hooks/use-reference-chooser.js';
import { useMobile }             from '../../hooks/use-mobile.js';
import { useDismissLayer }       from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY }      from '../../services/dismiss-stack.js';

export function ReferenceChooser() {
  const {
    open, closeChooser,
    referenceLorebook, isPaired,
    candidates, pair, unpair, browse,
  } = useReferenceChooser();
  const isMobile = useMobile();

  useDismissLayer('reference-chooser', open, DISMISS_PRIORITY.modal, closeChooser);

  if (!open) return null;

  return createPortal(
    <>
      <div className="popover-backdrop" onClick={closeChooser} />
      <div className="ref-chooser" role="dialog" aria-label="Reference lorebook">
        <div className="ref-chooser-head">
          <span className="ref-chooser-title">Reference lorebook</span>
          <button
            type="button"
            className="ref-chooser-close touch-floor-box"
            onClick={closeChooser}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="ref-chooser-blurb">
          A reference lorebook is a second book pinned beside this one, read-only.
          Shared triggers and same-named entries surface as you write, and search
          and find/replace can reach across both.
        </p>

        {isPaired ? (
          <div className="ref-chooser-current">
            <div className="ref-chooser-current-row">
              <span className="ref-chooser-badge">REF</span>
              <span className="ref-chooser-current-name">
                {referenceLorebook?.name || '(unnamed)'}
              </span>
            </div>
            <div className="ref-chooser-current-actions">
              {isMobile && (
                <button type="button" className="ref-chooser-btn" onClick={browse}>
                  Browse
                </button>
              )}
              <button
                type="button"
                className="ref-chooser-btn ref-chooser-btn--unpair"
                onClick={unpair}
              >
                Unpair
              </button>
            </div>
          </div>
        ) : (
          <div className="ref-chooser-none">No lorebook is paired yet.</div>
        )}

        <div className="ref-chooser-list-label">
          {isPaired ? 'Pair a different book' : 'Pair a book'}
        </div>
        <div className="ref-chooser-list">
          {candidates.length === 0 ? (
            <div className="ref-chooser-empty">
              Nothing to pair with — you only have this one lorebook.
            </div>
          ) : (
            candidates.map((item) => (
              <button
                key={item.id}
                type="button"
                className="ref-chooser-row"
                onClick={() => pair(item.id)}
              >
                <span className="ref-chooser-row-name">{item.name || '(unnamed)'}</span>
                {item.relativeTime && (
                  <span className="ref-chooser-row-time">{item.relativeTime}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

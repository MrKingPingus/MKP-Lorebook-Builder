// "What's changed" notice, shown over the lander once per release.
//
// The app opens on the lander every load, and the lander already carries the
// full changelog — but as its fourth panel, well below the fold. This surfaces
// the newest release for someone returning after an update, without making them
// go looking for something they didn't know had happened.
//
// Deliberately easy to escape: ×, Escape, or clicking the backdrop. Dismissing
// is permanent for that release. Nothing here is load-bearing — a user who
// closes it immediately loses nothing, and the full changelog stays on the
// lander for anyone who wants it later.
import { useRef, useEffect } from 'react';
import { useDismissLayer }  from '../../hooks/use-dismiss-layer.js';
import { MarkdownView }     from '../ui/MarkdownView.jsx';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';

export function UpdateNotice({ release, onClose, onShowTour }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useDismissLayer('update-notice', true, DISMISS_PRIORITY.modal, onClose);

  // Focus lands on Close rather than the tour button: the safe, common action
  // should be what Enter hits, not the one that starts something.
  useEffect(() => { closeRef.current?.focus(); }, []);

  return (
    <div
      className="update-notice-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className="update-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-notice-title"
      >
        <div className="update-notice-header">
          <div>
            <h2 className="update-notice-title" id="update-notice-title">What&rsquo;s changed</h2>
            {/* The heading is the release identifier verbatim — "0.9.0 —
                2026-07-30", or a bare date for releases that predate
                versioning. Under "What's changed" it needs no label. */}
            <p className="update-notice-date">{release.id}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="update-notice-close"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="update-notice-body">
          <MarkdownView blocks={release.userBlocks ?? release.blocks} />
        </div>

        <div className="update-notice-actions">
          {/* The tour is optional — a release with no captured screenshots
              shows the notes alone rather than a button leading nowhere. */}
          {onShowTour && (
            <button type="button" className="update-notice-btn update-notice-btn--primary" onClick={onShowTour}>
              Show me the new features
            </button>
          )}
          <button type="button" className="update-notice-btn" onClick={onClose}>
            {onShowTour ? 'Not now' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

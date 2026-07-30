// Click-through tour of a release's new features.
//
// Deliberately not a live tour driving the real UI. The things worth pointing
// at mostly don't exist until something is open — the book list only while the
// title menu is up, the sizing controls only while that menu is — so a live
// tour would have to drive app state, handle targets that aren't there yet, and
// cope with the window moving underneath it. Annotated screenshots have none of
// those failure modes, and a 0.9.0 screenshot stays correct for 0.9.0 forever.
//
// The captions carry the information; the images support them. Text baked into
// a PNG ignores the text-size setting, can't be selected, and is invisible to a
// screen reader — so the words are real text and every image has alt text.
import { useState, useEffect, useRef } from 'react';
import { useDismissLayer }  from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { TOUR_STEPS, TOUR_RELEASE } from '../../constants/tour-steps.js';

// Built from BASE_URL rather than a bare absolute path: the deployed site lives
// under /<repo-name>/ on Pages, where "/screenshots/…" would 404.
function imageUrl(file) {
  return `${import.meta.env.BASE_URL}screenshots/${TOUR_RELEASE}/${file}`;
}

export function FeatureTour({ onClose }) {
  const [index, setIndex]    = useState(0);
  const [zoomed, setZoomed]  = useState(false);
  const nextRef = useRef(null);

  const step  = TOUR_STEPS[index];
  const first = index === 0;
  const last  = index === TOUR_STEPS.length - 1;

  // Escape backs out of the enlarged view before it closes the tour, so a user
  // who zoomed in doesn't lose their place in the sequence.
  useDismissLayer('feature-tour', true, DISMISS_PRIORITY.modal,
    () => (zoomed ? setZoomed(false) : onClose()));

  useEffect(() => { nextRef.current?.focus(); }, []);

  // Fetch the next image while the current one is being read, so clicking
  // through doesn't wait on the network each time. Nothing is preloaded until
  // the tour is actually opened — the whole point of keeping it opt-in.
  useEffect(() => {
    const upcoming = TOUR_STEPS[index + 1];
    if (!upcoming) return;
    const img = new Image();
    img.src = imageUrl(upcoming.file);
  }, [index]);

  function go(delta) {
    setZoomed(false);
    setIndex((i) => Math.min(TOUR_STEPS.length - 1, Math.max(0, i + delta)));
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
  }

  return (
    <div
      className="tour-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={`What's new — step ${index + 1} of ${TOUR_STEPS.length}`}
    >
      <div className="tour-panel">
        <div className="tour-header">
          <div>
            <h2 className="tour-title">{step.title}</h2>
            <p className="tour-progress">{index + 1} of {TOUR_STEPS.length}</p>
          </div>
          <button
            type="button"
            className="tour-close"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Captured at 2x, so there is real detail to enlarge into. */}
        <button
          type="button"
          className="tour-shot"
          onClick={() => setZoomed(true)}
          title="Click to enlarge"
        >
          <img src={imageUrl(step.file)} alt={step.alt} />
          <span className="tour-zoom-hint" aria-hidden="true">Click to enlarge</span>
        </button>

        <p className="tour-body">{step.body}</p>

        <div className="tour-actions">
          <div className="tour-dots" role="tablist" aria-label="Steps">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.title}
                className={`tour-dot${i === index ? ' tour-dot--on' : ''}`}
                onClick={() => { setZoomed(false); setIndex(i); }}
              />
            ))}
          </div>
          <div className="tour-nav">
            <button type="button" className="tour-btn" onClick={() => go(-1)} disabled={first}>
              Back
            </button>
            {last ? (
              <button ref={nextRef} type="button" className="tour-btn tour-btn--primary" onClick={onClose}>
                Done
              </button>
            ) : (
              <button ref={nextRef} type="button" className="tour-btn tour-btn--primary" onClick={() => go(1)}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enlarged view — the reason the captures are 2x rather than 1x. */}
      {zoomed && (
        <div
          className="tour-zoom"
          onMouseDown={() => setZoomed(false)}
          role="dialog"
          aria-label={`${step.title} — enlarged`}
        >
          <img src={imageUrl(step.file)} alt={step.alt} />
          <span className="tour-zoom-close">Click anywhere to close</span>
        </div>
      )}
    </div>
  );
}

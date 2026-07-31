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
import { TOUR_STEPS, TOUR_RELEASE, TOUR_CAPTURE_SCALE } from '../../constants/tour-steps.js';

// Built from BASE_URL rather than a bare absolute path: the deployed site lives
// under /<repo-name>/ on Pages, where "/screenshots/…" would 404.
function imageUrl(file) {
  return `${import.meta.env.BASE_URL}screenshots/${TOUR_RELEASE}/${file}`;
}

// The caption and the numbered labels, as real text. Rendered in both the panel
// and the enlarged view — the explanation used to be painted into the image, so
// enlarging in order to read the screenshot took the words away with it.
function StepNotes({ step, className = '' }) {
  return (
    <div className={`tour-notes ${className}`.trim()}>
      <p className="tour-body">{step.body}</p>
      {step.marks?.length > 0 && (
        <ol className="tour-marks">
          {step.marks.map((m, i) => (
            <li key={i}>
              <span className="tour-mark-num" aria-hidden="true">{i + 1}</span>
              {m.label}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function FeatureTour({ onClose }) {
  const [index, setIndex]    = useState(0);
  const [zoomed, setZoomed]  = useState(false);
  // Natural width of the current image, so the enlarged view can render it at
  // the builder's true on-screen size. Captures are at TOUR_CAPTURE_SCALE, so
  // showing them at raw pixel width reads as roughly 2x zoomed — well past
  // being readable as a screenshot of an interface.
  const [naturalWidth, setNaturalWidth] = useState(0);
  // Whether the enlarged image is taller than the space it has, so the hint can
  // say the view scrolls rather than leaving someone to discover it.
  const [zoomOverflows, setZoomOverflows] = useState(false);
  const nextRef = useRef(null);
  const zoomRef = useRef(null);

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

  // A mousedown anywhere in the enlarged view closes it — except on its own
  // scrollbar, which reports as a click on the container and would otherwise
  // dismiss the image the moment someone tried to scroll it.
  function closeZoom(e) {
    const box = e.currentTarget;
    if (e.clientX - box.getBoundingClientRect().left >= box.clientWidth) return;
    setZoomed(false);
  }

  function go(delta) {
    setZoomed(false);
    setNaturalWidth(0);
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
          <img
            src={imageUrl(step.file)}
            alt={step.alt}
            onLoad={(e) => setNaturalWidth(e.currentTarget.naturalWidth)}
          />
          <span className="tour-zoom-hint" aria-hidden="true">Click to enlarge</span>
        </button>

        <StepNotes step={step} />

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
          ref={zoomRef}
          className="tour-zoom"
          onMouseDown={closeZoom}
          role="dialog"
          aria-label={`${step.title} — enlarged`}
        >
          <div className="tour-zoom-figure">
            <img
              src={imageUrl(step.file)}
              alt={step.alt}
              style={naturalWidth ? { width: naturalWidth / TOUR_CAPTURE_SCALE } : undefined}
              onLoad={(e) => {
                const box = zoomRef.current;
                setZoomOverflows(Boolean(box) && e.currentTarget.height > box.clientHeight);
              }}
            />
          </div>
          {/* Stops click-to-close firing when someone clicks into the notes to
              read or select them. */}
          <aside className="tour-zoom-aside" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="tour-zoom-aside-title">{step.title}</h3>
            <StepNotes step={step} className="tour-notes--aside" />
            <p className="tour-zoom-close">
              {zoomOverflows ? 'Scroll to see the rest · click the image to close' : 'Click the image to close'}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

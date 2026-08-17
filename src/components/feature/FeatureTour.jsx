// Guided tour of a release's new features, spotlighting the real app.
//
// Renders two things over the live interface: a scrim with holes punched in it
// around the current step's controls, and a caption bubble beside them. All the
// state — which step, getting the app there, where the controls are — belongs to
// `use-tour.js`; this file places boxes.
//
// **Taps pass through.** The scrim is `pointer-events: none`, so a spotlit
// control is not merely visible but usable: tapping the lorebook title really
// opens the lorebook menu and the tour follows. Intercepting the tap instead
// would make this a screenshot gallery with extra steps — the user would learn
// the control is there but never that it works.
//
// **Why SVG rather than a box-shadow.** The first version was one div per step
// with `box-shadow: 0 0 0 9999px`, which is a neat trick for a single hole and
// cannot do two: a second such div darkens the first one's hole. Some steps
// genuinely point at two controls — the title menu's two tabs are one idea, not
// two steps — so the scrim is a masked rect and each hole is a `<rect>` in the
// mask. Rings come from the same list, so a ring can never disagree with a hole
// about where its control is.
//
// No step dots. Because taps really work, the steps are a path through the app
// rather than a set — a later step's target does not exist until the app has been
// walked there — so a dot row could not honour a click. The "3 of 7" readout says
// the same thing without promising navigation it cannot do.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTour }          from '../../hooks/use-tour.js';
import { useDismissLayer }  from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import {
  TOUR_SPOTLIGHT_PAD_PX, TOUR_BUBBLE_GAP_PX, POPOVER_EDGE_PAD_PX,
} from '../../constants/limits.js';

const grow = (r, by) => ({
  top: r.top - by, bottom: r.bottom + by, left: r.left - by, right: r.right + by,
});

const union = (rs) => rs.reduce((a, r) => ({
  top:    Math.min(a.top, r.top),
  left:   Math.min(a.left, r.left),
  right:  Math.max(a.right, r.right),
  bottom: Math.max(a.bottom, r.bottom),
}));

/**
 * Where the caption goes, given everything the step is pointing at.
 *
 * Deliberately *not* `use-anchored-position.js`, which the single-rect version
 * used. That hook flips on which half of the viewport the anchor sits in — a fine
 * heuristic for a small popover anchor, and wrong here, because a step can
 * spotlight something tall. An open Actions menu runs from y=162 past the fold:
 * it is "in the lower half", so the hook flipped the bubble upward and anchored
 * it with `bottom`, putting its top off the top of the screen. Nothing caught it
 * earlier because every target measured until then was small.
 *
 * So: measure both gaps, prefer below, take the roomier one when neither fits,
 * and clamp into the viewport. Costs a measured height, which is why the caller
 * measures the bubble in a layout effect.
 */
function place(spot, h, vh) {
  const below = vh - spot.bottom - TOUR_BUBBLE_GAP_PX - POPOVER_EDGE_PAD_PX;
  const above = spot.top - TOUR_BUBBLE_GAP_PX - POPOVER_EDGE_PAD_PX;

  let top;
  if (below >= h)           top = spot.bottom + TOUR_BUBBLE_GAP_PX;
  else if (above >= h)      top = spot.top - TOUR_BUBBLE_GAP_PX - h;
  else if (below >= above)  top = spot.bottom + TOUR_BUBBLE_GAP_PX;
  else                      top = spot.top - TOUR_BUBBLE_GAP_PX - h;

  return Math.max(POPOVER_EDGE_PAD_PX, Math.min(top, vh - POPOVER_EDGE_PAD_PX - h));
}

export function FeatureTour() {
  const { active, step, index, total, rects, lost, first, last, go, close, recover } = useTour();
  const nextRef   = useRef(null);
  const bubbleRef = useRef(null);
  const [bubbleH, setBubbleH] = useState(0);
  const [vp, setVp] = useState(() => ({
    w: typeof window === 'undefined' ? 0 : window.innerWidth,
    h: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  // Lowest priority in the stack, so Escape closes whatever the tour opened
  // before it closes the tour. See the comment on DISMISS_PRIORITY.tour.
  useDismissLayer('feature-tour', active, DISMISS_PRIORITY.tour, close);

  useEffect(() => { if (active) nextRef.current?.focus(); }, [active, index]);

  // The scrim is sized in user units, so it has to follow the viewport — an
  // on-screen keyboard or a rotation changes it.
  useEffect(() => {
    if (!active) return;
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  // Before paint, so the bubble never appears at a wrong height first.
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (el) setBubbleH(el.getBoundingClientRect().height);
  }, [active, step?.id, lost, index]);

  if (!active || !step) return null;

  // In transit: `arrive` is walking the app to this step's target and there is
  // nothing to ring yet. The scrim stays (so the app reads as held) and the
  // caption sits mid-screen — rather than blinking the whole tour out, or worse,
  // keeping the previous step's ring lit under the new step's words.
  const holes = rects.map((r) => grow(r, TOUR_SPOTLIGHT_PAD_PX));
  const spot  = holes.length > 0 ? union(holes) : null;
  const top   = spot
    ? place(spot, bubbleH, vp.h)
    : Math.max(POPOVER_EDGE_PAD_PX, (vp.h - bubbleH) / 2);

  return (
    <div className="tour-layer" role="dialog" aria-modal="false"
         aria-label={`What's new — step ${index + 1} of ${total}`}>
      <svg className="tour-scrim" width={vp.w} height={vp.h}
           viewBox={`0 0 ${vp.w} ${vp.h}`} aria-hidden="true">
        <defs>
          {/* White passes the scrim through, black punches it out — which is what
              lets one scrim carry any number of holes. */}
          <mask id="tour-holes">
            <rect x="0" y="0" width={vp.w} height={vp.h} fill="#fff" />
            {holes.map((r, i) => (
              <rect key={i} x={r.left} y={r.top}
                    width={r.right - r.left} height={r.bottom - r.top}
                    rx="10" fill="#000" />
            ))}
          </mask>
        </defs>
        <rect className="tour-scrim-fill" x="0" y="0" width={vp.w} height={vp.h}
              mask="url(#tour-holes)" />
        {holes.map((r, i) => (
          <rect key={i} className="tour-ring" x={r.left} y={r.top}
                width={r.right - r.left} height={r.bottom - r.top} rx="10" />
        ))}
      </svg>

      <div ref={bubbleRef} className="tour-bubble" style={{ top: `${top}px` }}>
        <h2 className="tour-bubble-title">{step.title}</h2>
        <p className="tour-bubble-body">{step.body}</p>

        {/* The user closed what the step opened. Offered rather than silently
            re-opened: putting it back behind them is what would make taps stop
            feeling real. */}
        {lost && (
          <button type="button" className="tour-recover" onClick={recover}>
            Show me that again
          </button>
        )}

        <div className="tour-bubble-actions">
          <span className="tour-progress">{index + 1} of {total}</span>
          <span className="tour-nav">
            <button type="button" className="tour-btn" onClick={() => go(-1)} disabled={first}>
              Back
            </button>
            {last ? (
              <button ref={nextRef} type="button" className="tour-btn tour-btn--primary" onClick={close}>
                Done
              </button>
            ) : (
              <button ref={nextRef} type="button" className="tour-btn tour-btn--primary" onClick={() => go(1)}>
                Next
              </button>
            )}
          </span>
        </div>

        <button type="button" className="tour-skip" onClick={close}>Skip the tour</button>
      </div>
    </div>
  );
}

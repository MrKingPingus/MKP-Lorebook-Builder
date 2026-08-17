// Guided tour of a release's new features, spotlighting the real app.
//
// Renders two things over the live interface: a scrim with a hole punched in it
// around the current step's control, and a caption bubble beside it. All the
// state — which step, getting the app there, where the control is — belongs to
// `use-tour.js`; this file places boxes.
//
// **Taps pass through.** The scrim is `pointer-events: none`, so the spotlit
// control is not merely visible but usable: tapping the lorebook title really
// opens the lorebook menu and the tour follows. Intercepting the tap instead
// would make this a screenshot gallery with extra steps — the user would learn
// the control is there but never that it works.
//
// The bubble is placed by `use-anchored-position.js` rather than by measuring
// itself first. That hook anchors the flipped case with `bottom`, so the bubble
// grows upward on its own and never needs a height before it can be positioned
// — no first-paint flicker. Its flip rule is which half of the viewport the
// target sits in, which stays safe as long as captions stay short; see the note
// in `constants/tour-steps.js`.
//
// Why a bubble and not a sheet docked to the screen's bottom edge: measured at
// 360x640 against a top, middle and bottom target, a docked sheet's top edge
// lands at y=461 while the hotbar runs 583-640 — it covers the control it is
// describing. It also fails softly at the top, leaving the caption a full screen
// away from its subject. One thing that measurement corrected: at 360px the
// bubble is full-width-minus-margins regardless, so it never sits *beside* a
// control, only above or below it.
//
// No step dots. Because taps really work, the steps are a path through the app
// rather than a set — step 4's target does not exist until the app has been
// walked there — so a dot row could not honour a click. The "3 of 5" readout
// says the same thing without promising navigation it cannot do.
import { useEffect, useRef } from 'react';
import { useTour }              from '../../hooks/use-tour.js';
import { useAnchoredPosition }  from '../../hooks/use-anchored-position.js';
import { useDismissLayer }      from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY }     from '../../services/dismiss-stack.js';
import { TOUR_SPOTLIGHT_PAD_PX, POPOVER_EDGE_PAD_PX } from '../../constants/limits.js';

export function FeatureTour() {
  const { active, step, index, total, rect, lost, first, last, go, close, recover } = useTour();
  const nextRef = useRef(null);

  // Lowest priority in the stack, so Escape closes whatever the tour opened
  // before it closes the tour. See the comment on DISMISS_PRIORITY.tour.
  useDismissLayer('feature-tour', active, DISMISS_PRIORITY.tour, close);

  useEffect(() => { if (active) nextRef.current?.focus(); }, [active, index]);

  // The bubble spans the viewport's usable width at any phone size, so the
  // anchoring only has to decide the side. Computed unconditionally — the hook
  // is a pure function and returns null for a null rect.
  const width = typeof window === 'undefined'
    ? 0
    : window.innerWidth - POPOVER_EDGE_PAD_PX * 2;
  const grown = rect ? {
    top:    rect.top    - TOUR_SPOTLIGHT_PAD_PX,
    bottom: rect.bottom + TOUR_SPOTLIGHT_PAD_PX,
    left:   rect.left   - TOUR_SPOTLIGHT_PAD_PX,
    right:  rect.right  + TOUR_SPOTLIGHT_PAD_PX,
  } : null;
  const bubbleStyle = useAnchoredPosition(grown, width);

  if (!active || !step) return null;

  return (
    <div className="tour-layer" role="dialog" aria-modal="false"
         aria-label={`What's new — step ${index + 1} of ${total}`}>
      {/* The scrim is this element's own huge box-shadow, so the "hole" needs no
          mask, no clip-path and no four-band arithmetic. It carries the ring
          too, which keeps them from ever disagreeing about where the target is. */}
      {grown && (
        <div
          className="tour-spot"
          style={{
            left:   `${grown.left}px`,
            top:    `${grown.top}px`,
            width:  `${grown.right - grown.left}px`,
            height: `${grown.bottom - grown.top}px`,
          }}
        />
      )}

      <div className="tour-bubble" style={bubbleStyle ?? undefined}>
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

// What we assume about the device from the viewport width alone.
//
// One number decides it: below MOBILE_BREAKPOINT_PX the app renders its mobile
// surface and assumes a finger, at or above it assumes a pointer. Every layout
// branch in the app hangs off `useMobile()`, which is the only place this is
// read — see hooks/use-mobile.js.
export const MOBILE_BREAKPOINT_PX = 768;

// Touch-target floor, in **hit area** — not visual size.
//
// WCAG 2.5.5 (AAA) asks for 44×44 CSS px and the Apple HIG asks for 44pt, and
// both are about the region that responds to a tap, not the ink inside it. That
// distinction is the whole reason this is set as a floor rather than a minimum
// height: a 24px chip can carry a 44px target through padding or a stretched
// ::before overlay without growing the row it sits in.
//
// It mattered because 14C reclaimed 89px of chrome while 14D had to raise 52
// undersized controls. Read as a *visual* floor those two fight over the same
// pixels; read as a hit-area floor, most cost no layout height at all. The CSS
// side is --touch-floor / .touch-floor in style.css §TOUCH-FLOOR.
//
// **How that bet actually paid out, now 14D has run it (2026-08-16).** The
// overlay carried the header title, the gear, the sort button, the hotbar and
// the card badges for free. It could not carry the search row, the filter row,
// any list of stacked rows, or a single form control — so the floor cost +23px
// of chrome at 360×640 rather than the 0 the hit-area reading promised, or the
// ~35px a naive visual floor would have. Worth knowing before assuming the
// overlay will absorb the next one too: it is the cheaper half of the answer,
// not the whole of it.
//
// Four things learned the hard way; the long version is in docs/plan.md under
// 14D, and style.css §TOUCH-FLOOR carries the three failure modes in full.
//
//   1. Prefer making a control the size it needs over overlaying a hit region
//      onto one that is too small. The overlay is for controls that genuinely
//      cannot grow; absorbing a parent's padding with a negative margin is
//      usually available and is honest about what the target is.
//   2. `.touch-floor` is inert on an element with `overflow: hidden`, because
//      an element clips its own ::before — including when the clip is two
//      levels up, which is how the role bar and the card's ref badge failed.
//   3. It is inert on `<input>`, `<select>` and `<textarea>` outright: replaced
//      elements generate no pseudo-element. Form controls must grow.
//   4. An overlay that reaches into a neighbouring control is *stealing* that
//      control's taps, and the honest fixes are to widen the gap or grow. Rows
//      in a list are always in this case, by construction.
//
// verify/layout-invariants.mjs measures the *effective* hit area by probing
// rather than reading a bounding box, so all of these fail the sweep instead of
// shipping quietly — and since 14D the sweep fails the run rather than noting it.
export const TOUCH_TARGET_MIN_PX = 44;

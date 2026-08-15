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
// It matters because 14C is trying to reclaim 238px of chrome while 14D grows
// 57 undersized controls. Read as a *visual* floor those two fight over the
// same pixels; read as a hit-area floor most of the 57 cost no layout height at
// all. The CSS side is --touch-floor / .touch-floor in style.css §TOUCH-FLOOR.
//
// Two things learned the hard way, both worth knowing before reaching for the
// utility (the long version is in docs/plan.md under 14D):
//
//   1. Prefer making a control the size it needs over overlaying a hit region
//      onto one that is too small. The overlay is for controls that genuinely
//      cannot grow; absorbing a parent's padding with a negative margin is
//      usually available and is honest about what the target is.
//   2. `.touch-floor` is inert on an element with `overflow: hidden`, because
//      an element clips its own ::before. Keep the ellipsis one layer in.
//
// verify/layout-invariants.mjs measures the *effective* hit area by probing
// rather than reading a bounding box, so both mistakes fail the sweep instead
// of shipping quietly.
export const TOUCH_TARGET_MIN_PX = 44;

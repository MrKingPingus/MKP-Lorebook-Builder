// Fixed-position style for a popover hanging off an anchor's rect.
//
// The flip matters because 13C moved the storage ring from the header to the
// status footer. A popover that always hung downward was fine two pixels below
// the title bar and useless two pixels above the bottom of the screen.
//
// Anchoring the flipped case with `bottom` rather than `top` means the popover
// grows upward on its own and never has to be measured first — the same trick
// the sizing menu's flyouts use.
//
// This is a pure function with no React state of its own. It lives in hooks/
// and is named use-* because components may only import from hooks/, and two
// components need it. Call it unconditionally like any other hook.
import { POPOVER_ANCHOR_GAP_PX, POPOVER_EDGE_PAD_PX } from '../constants/limits.js';

export function useAnchoredPosition(anchorRect, width) {
  if (!anchorRect) return null;

  // Right-aligned to the anchor, then pulled back inside the viewport.
  const left = Math.max(
    POPOVER_EDGE_PAD_PX,
    Math.min(
      anchorRect.right - width,
      window.innerWidth - width - POPOVER_EDGE_PAD_PX,
    ),
  );

  // Flip whenever the anchor sits in the lower half of the viewport. Cheaper and
  // steadier than measuring: anything down there has more room above than below.
  const flipUp = anchorRect.bottom > window.innerHeight / 2;

  return flipUp
    ? {
        position: 'fixed',
        bottom: window.innerHeight - anchorRect.top + POPOVER_ANCHOR_GAP_PX,
        left,
      }
    : {
        position: 'fixed',
        top: anchorRect.bottom + POPOVER_ANCHOR_GAP_PX,
        left,
      };
}

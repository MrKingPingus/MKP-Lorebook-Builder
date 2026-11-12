// A portalled panel that hangs off a menu row — opens to the right, flips left
// only when the viewport genuinely cannot fit it.
//
// Extracted from `ScaleMenu.jsx`, which had the only one, when the entry `⋯`
// menu's submenus became flyouts too. Both live inside `.floating-window`,
// which sets `overflow: hidden`, so an in-window flyout could only ever open
// LEFT — back over the menu it belongs to. Portalled and `position: fixed`,
// they open right into the page like a submenu should.
//
// Positioning is measured rather than guessed, because a flyout's width and
// height both depend on its contents (a list of lorebooks, a list of folders,
// a name field) and neither is known until it has rendered. It is therefore
// laid out hidden on the first pass and revealed on the second — one frame,
// invisible to the user, and it costs nothing to be exactly right instead of
// approximately right.
//
// `children` is in the layout effect's deps, which is what re-measures the
// panel whenever its OWNER re-renders — and that is load-bearing for the entry
// `⋯` menu, which sits over a list that scrolls: the row this hangs off slides
// under it, and a flyout that measured once would be left behind. It does not
// re-measure on its own state changes, since those leave `children` identical,
// so there is no loop.
import { useRef, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FLYOUT_GAP_PX, FLYOUT_VIEWPORT_PAD } from '../../constants/scaling.js';

/**
 * @param anchorEl   the row element the flyout hangs off
 * @param align      'top'    — the flyout's top edge meets the row's (a menu
 *                              that grows downward, e.g. the entry ⋯ menu)
 *                   'bottom' — its bottom edge meets the row's bottom (a menu
 *                              hanging off a bar at the base of the window,
 *                              e.g. the footer's sizing menu)
 */
export function Flyout({ anchorEl, className, align = 'bottom',
                         onMouseEnter, onMouseLeave, children }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchorEl) return;
    const row  = anchorEl.getBoundingClientRect();
    const box  = el.getBoundingClientRect();
    const padd = FLYOUT_VIEWPORT_PAD;

    // Prefer right. Flip only when the flyout genuinely will not fit.
    let left = row.right + FLYOUT_GAP_PX;
    if (left + box.width > window.innerWidth - padd) {
      const flipped = row.left - box.width - FLYOUT_GAP_PX;
      left = flipped >= padd ? flipped : Math.max(padd, window.innerWidth - box.width - padd);
    }

    let top = align === 'top' ? row.top : row.bottom - box.height;
    if (top < padd) top = padd;
    if (top + box.height > window.innerHeight - padd) {
      top = Math.max(padd, window.innerHeight - box.height - padd);
    }

    setPos({ left, top });
  }, [anchorEl, align, children]);

  return createPortal(
    <div
      ref={ref}
      className={className}
      role="menu"
      style={{
        position: 'fixed',
        left: pos?.left ?? -9999,
        top:  pos?.top  ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body,
  );
}

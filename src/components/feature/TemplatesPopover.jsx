// The templates picker in a free-standing popover, opened with no entry behind
// it — so its only load action is "New entry from this".
//
// Two surfaces open it, which is why it is its own piece rather than living in
// either. The empty entry list's "start from a template" link was the first; the
// + button's hover menu and Shift+Alt+N are the second, added once making a new
// entry from a template turned out to be the common case and the empty-list
// link only covers a book with nothing in it.
//
// Controlled: the owner decides when it is open and what it hangs off. It
// handles everything after that — placement, Escape, outside clicks, and moving
// focus inside, which matters most for the keyboard route (a shortcut that opens
// a menu and leaves focus behind is a shortcut you then have to reach for the
// mouse to finish).
import { useRef, useEffect } from 'react';
import { createPortal }        from 'react-dom';
import { TemplatesPanel }      from './TemplatesPanel.jsx';
import { useAnchoredPosition } from '../../hooks/use-anchored-position.js';
import { useDismissLayer }     from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY }    from '../../services/dismiss-stack.js';
import { ENTRY_MENU_WIDTH_PX } from '../../constants/limits.js';

/**
 * @param dismissId  unique per surface — two of these can coexist
 * @param anchorRect the rect to hang off; it flips upward in the lower half of
 *                   the viewport, which is where the + button lives
 * @param ignoreRef  the opener, so clicking it toggles rather than
 *                   close-then-reopen
 */
export function TemplatesPopover({ open, anchorRect, onClose, dismissId, ignoreRef }) {
  const panelRef = useRef(null);
  const style = useAnchoredPosition(open ? anchorRect : null, ENTRY_MENU_WIDTH_PX);

  useDismissLayer(dismissId, open, DISMISS_PRIORITY.popover, onClose);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (panelRef.current?.contains(e.target)) return;
      if (ignoreRef?.current?.contains(e.target)) return;
      onClose();
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onClose, ignoreRef]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector('button')?.focus();
  }, [open]);

  if (!open || !style) return null;
  return createPortal(
    <div
      ref={panelRef}
      className="entry-actions-flyout templates-popover"
      style={{ ...style, width: ENTRY_MENU_WIDTH_PX }}
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <TemplatesPanel entry={null} onDone={onClose} />
    </div>,
    document.body,
  );
}

// A standalone way into the templates picker, for where there is no entry to
// hang a ⋯ menu off.
//
// The entry list's empty state is the case this exists for. Templates are
// global and the whole point of them is starting a book that has nothing in it
// yet — but every other route to them runs through a specific entry's menu, so
// a brand-new lorebook was the one place you could not reach your own
// scaffolds. The panel itself is the same component; it just renders with no
// `entry`, which is what drops "Fill this entry" from the load actions.
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal }        from 'react-dom';
import { TemplatesPanel }      from './TemplatesPanel.jsx';
import { useAnchoredPosition } from '../../hooks/use-anchored-position.js';
import { useDismissLayer }     from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY }    from '../../services/dismiss-stack.js';
import { ENTRY_MENU_WIDTH_PX } from '../../constants/limits.js';

export function TemplatesButton({ label = 'start from a template', className = '' }) {
  const [open, setOpen]     = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef   = useRef(null);
  const panelRef = useRef(null);

  const style = useAnchoredPosition(anchor, ENTRY_MENU_WIDTH_PX);

  const close = useCallback(() => setOpen(false), []);
  useDismissLayer('templates-button', open, DISMISS_PRIORITY.popover, close);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (panelRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      close();
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, close]);

  return (
    <>
      <button
        ref={btnRef}
        className={`templates-link ${className}`.trim()}
        onClick={() => {
          if (open) { close(); return; }
          setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
          setOpen(true);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        {label}
      </button>

      {open && style && createPortal(
        <div
          ref={panelRef}
          className="entry-actions-flyout"
          style={{ ...style, width: ENTRY_MENU_WIDTH_PX }}
          role="menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <TemplatesPanel entry={null} onDone={close} />
        </div>,
        document.body,
      )}
    </>
  );
}

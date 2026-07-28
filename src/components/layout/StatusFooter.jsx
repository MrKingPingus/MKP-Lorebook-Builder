// Thin always-visible status bar below the hotbar (desktop only).
//
// The division of labour with the hotbar is deliberate and is the rule for
// where any future control goes: the hotbar holds verbs on content (add, undo,
// export), this bar holds app state and view controls. Nothing here changes a
// lorebook.
//
// Phase 13A ships the shell plus the sizing menu. The storage ring, feedback
// links and entry counts join it in 13C, when the header is being rebuilt
// anyway — moving them now would mean editing WindowHeader twice.
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSaveStatus }   from '../../hooks/use-save-status.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { ScaleMenu }       from '../feature/ScaleMenu.jsx';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';

export function StatusFooter() {
  const { label, title, fresh } = useSaveStatus();
  const [scaleOpen, setScaleOpen]   = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);
  const scaleBtnRef = useRef(null);

  useDismissLayer('footer:scale-menu', scaleOpen, DISMISS_PRIORITY.popover, () => setScaleOpen(false));

  const openMenu = useCallback(() => {
    setAnchorRect(scaleBtnRef.current?.getBoundingClientRect() ?? null);
    setScaleOpen(true);
  }, []);

  // The menu and its flyouts are portalled to document.body (they have to
  // escape .floating-window's overflow:hidden to open rightward), so an
  // outside-click test against the footer alone would close the menu the
  // instant the pointer entered it. Check the portalled roots too.
  useEffect(() => {
    if (!scaleOpen) return undefined;
    function onMouseDown(e) {
      if (scaleBtnRef.current?.contains(e.target)) return;
      if (e.target.closest?.('.scale-menu, .scale-flyout')) return;
      setScaleOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [scaleOpen]);

  // A portalled menu is positioned from a rect captured at open time, so it
  // would drift if the window moved or resized underneath it. Cheaper and
  // steadier to close it than to re-measure on every frame of a drag.
  useEffect(() => {
    if (!scaleOpen) return undefined;
    const close = () => setScaleOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [scaleOpen]);

  return (
    <div className="status-footer">
      <div className="status-left">
        <span className={`status-save${fresh ? ' status-save--fresh' : ''}`} title={title}>
          <span className="status-save-dot" aria-hidden="true" />
          {label}
        </span>
      </div>

      <div className="status-right">
        <button
          ref={scaleBtnRef}
          type="button"
          className={`status-item${scaleOpen ? ' status-item--open' : ''}`}
          onClick={() => (scaleOpen ? setScaleOpen(false) : openMenu())}
          title="Sizing & scale"
          aria-label="Sizing and scale"
          aria-haspopup="menu"
          aria-expanded={scaleOpen}
        >
          <span className="status-item-icon" aria-hidden="true">⤢</span>
          Size
        </button>

        {scaleOpen && <ScaleMenu anchorRect={anchorRect} />}
      </div>
    </div>
  );
}

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
import { useState, useRef, useEffect } from 'react';
import { useSaveStatus }   from '../../hooks/use-save-status.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { ScaleMenu }       from '../feature/ScaleMenu.jsx';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';

export function StatusFooter() {
  const { label, title, fresh } = useSaveStatus();
  const [scaleOpen, setScaleOpen] = useState(false);
  const scaleWrapRef = useRef(null);

  useDismissLayer('footer:scale-menu', scaleOpen, DISMISS_PRIORITY.popover, () => setScaleOpen(false));

  useEffect(() => {
    if (!scaleOpen) return undefined;
    function onMouseDown(e) {
      if (scaleWrapRef.current && !scaleWrapRef.current.contains(e.target)) setScaleOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [scaleOpen]);

  return (
    <div className="status-footer">
      <div className="status-left">
        <span className={`status-save${fresh ? ' status-save--fresh' : ''}`} title={title}>
          <span className="status-save-dot" aria-hidden="true" />
          {label}
        </span>
      </div>

      <div className="status-right" ref={scaleWrapRef}>
        <button
          type="button"
          className={`status-item${scaleOpen ? ' status-item--open' : ''}`}
          onClick={() => setScaleOpen((v) => !v)}
          title="Sizing & scale"
          aria-label="Sizing and scale"
          aria-haspopup="menu"
          aria-expanded={scaleOpen}
        >
          ⤢ Size
        </button>

        {scaleOpen && <ScaleMenu />}
      </div>
    </div>
  );
}

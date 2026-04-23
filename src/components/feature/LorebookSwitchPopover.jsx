// Popover anchored next to the window-header name input. Lists all saved
// lorebooks except the one currently active — clicking a row switches to it.
// Renaming still happens in the name input itself; this popover owns the
// "pick another book" affordance only, mirroring the split control in solo
// mode (crosstalk uses the per-pane pickers instead).
import { useEffect, useRef } from 'react';
import { createPortal }      from 'react-dom';
import { useLorebookSwitcher } from '../../hooks/use-lorebook-switcher.js';

export function LorebookSwitchPopover({ anchorRect, onClose }) {
  const popoverRef = useRef(null);
  const { items, switchLorebook } = useLorebookSwitcher();

  const others = items.filter((item) => !item.isActive);

  useEffect(() => {
    function onDocClick(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    }
    // Defer attach so the click that opened the popover doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('click', onDocClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', onDocClick);
    };
  }, [onClose]);

  function pick(id) {
    switchLorebook(id);
    onClose();
  }

  const style = anchorRect
    ? {
        position: 'fixed',
        top:  anchorRect.bottom + 6,
        left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 260)),
      }
    : {};

  return createPortal(
    <div
      ref={popoverRef}
      className="lorebook-switch-popover"
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="lorebook-switch-popover-title">Switch to…</div>
      {others.length === 0 ? (
        <div className="lorebook-switch-empty">No other lorebooks saved.</div>
      ) : (
        <div className="lorebook-switch-list">
          {others.map((item) => (
            <button
              key={item.id}
              type="button"
              className="lorebook-switch-item"
              onClick={() => pick(item.id)}
              title={item.relativeTime ? `Last edited ${item.relativeTime}` : undefined}
            >
              <span className="lorebook-switch-item-name">{item.name || '(unnamed)'}</span>
              {item.relativeTime && (
                <span className="lorebook-switch-item-time">{item.relativeTime}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

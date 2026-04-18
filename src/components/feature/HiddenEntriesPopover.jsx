// Popover listing entries flagged hiddenFromExport — navigate or unhide from one place
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useEntries }    from '../../hooks/use-entries.js';
import { useUi }         from '../../hooks/use-ui.js';
import { useEntryDetail } from '../../hooks/use-entry-detail.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { TypeColorDot }  from '../ui/TypeColorDot.jsx';

export function HiddenEntriesPopover({ anchorRect, hiddenEntries, onClose }) {
  const popoverRef = useRef(null);
  const { updateEntry }        = useEntries();
  const setSearchFocusedId     = useUi((s) => s.setSearchFocusedId);
  const { openEntry }          = useEntryDetail();
  const isMobile               = useMobile();

  // Close on outside click — listen on 'click' so React's button onClick fires first
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

  function navigate(id) {
    if (isMobile) {
      openEntry(id);
    } else {
      setSearchFocusedId(id);
      requestAnimationFrame(() => {
        document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    onClose();
  }

  function unhide(entry) {
    updateEntry(entry.id, { hiddenFromExport: false }, true);
  }

  // Position below the anchor, right-aligned to it
  const style = anchorRect
    ? {
        position: 'fixed',
        top:  anchorRect.bottom + 6,
        left: Math.max(8, Math.min(anchorRect.left, window.innerWidth - 320)),
      }
    : {};

  return createPortal(
    <div
      ref={popoverRef}
      className="hidden-entries-popover"
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="hidden-entries-popover-title">Hidden from export</div>
      {hiddenEntries.length === 0 ? (
        <div className="hidden-entries-empty">No hidden entries.</div>
      ) : (
        <div className="hidden-entries-list">
          {hiddenEntries.map((e) => (
            <div key={e.id} className="hidden-entries-item">
              <button
                type="button"
                className="hidden-entries-entry"
                onClick={() => navigate(e.id)}
                title="Go to entry"
              >
                <TypeColorDot type={e.type} />
                <span className="hidden-entries-entry-name">{e.name || '(unnamed)'}</span>
              </button>
              <button
                type="button"
                className="hidden-entries-unhide"
                onClick={() => unhide(e)}
                title="Mark entry as visible in export"
              >
                Unhide
              </button>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}


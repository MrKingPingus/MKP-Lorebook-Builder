// Row of bulk actions shown while searchMode === 'select' — exit, select-all-visible, change-type popover
import { useRef, useEffect, useState } from 'react';
import { useSelection }   from '../../hooks/use-selection.js';
import { useBulkActions } from '../../hooks/use-bulk-actions.js';
import { ENTRY_TYPES }    from '../../constants/entry-types.js';

export function BulkActionBar({ visibleIds }) {
  const {
    selectedCount,
    hasSelection,
    clearSelection,
    selectAllVisible,
    exitSelectMode,
  } = useSelection();
  const { applyTypeChange } = useBulkActions();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    function onMouseDown(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [popoverOpen]);

  function onExit() {
    setPopoverOpen(false);
    exitSelectMode();
  }

  function onSelectAllVisible() {
    selectAllVisible(visibleIds);
  }

  function onApply(typeId) {
    applyTypeChange(typeId);
    setPopoverOpen(false);
  }

  return (
    <div className="bulk-action-bar">
      <button className="bulk-action-btn bulk-action-btn--exit" onClick={onExit} title="Exit select mode">
        × Exit
      </button>
      <button
        className="bulk-action-btn"
        onClick={onSelectAllVisible}
        disabled={visibleIds.length === 0}
        title="Add all currently visible entries to the selection"
      >
        Select All Visible
      </button>
      <button
        className="bulk-action-btn"
        onClick={clearSelection}
        disabled={!hasSelection}
      >
        Deselect All
      </button>

      <span className="bulk-action-count">{selectedCount} selected</span>

      <div className="bulk-action-btn-wrap" ref={popoverRef}>
        <button
          className="bulk-action-apply"
          onClick={() => setPopoverOpen((v) => !v)}
          disabled={!hasSelection}
        >
          Change Type… ▾
        </button>

        {popoverOpen && (
          <div className="replace-scope-popover bulk-action-popover">
            <div className="replace-scope-chips">
              {ENTRY_TYPES.map((t) => (
                <button
                  key={t.id}
                  className="replace-scope-chip bulk-type-chip"
                  style={{ '--type-color': t.color }}
                  onClick={() => onApply(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

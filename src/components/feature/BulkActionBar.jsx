// Row of bulk actions shown while searchMode === 'select' — exit, select-all-visible, change-type chips row
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

  const [chipsOpen, setChipsOpen] = useState(false);
  const barRef = useRef(null);

  // Close chips row on outside click (clicks inside the bar — including on buttons — keep it open)
  useEffect(() => {
    if (!chipsOpen) return;
    function onMouseDown(e) {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setChipsOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [chipsOpen]);

  function onExit() {
    setChipsOpen(false);
    exitSelectMode();
  }

  function onSelectAllVisible() {
    selectAllVisible(visibleIds);
  }

  function onApply(typeId) {
    applyTypeChange(typeId);
    setChipsOpen(false);
  }

  return (
    <div className="bulk-action-bar" ref={barRef}>
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

      <button
        className="bulk-action-apply"
        onClick={() => setChipsOpen((v) => !v)}
        disabled={!hasSelection}
      >
        Change Type… {chipsOpen ? '▴' : '▾'}
      </button>

      {chipsOpen && (
        <div className="bulk-action-chips">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.id}
              className="bulk-type-chip"
              style={{ '--type-color': t.color }}
              onClick={() => onApply(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Row of bulk actions shown while searchMode === 'select' — exit, select-all-visible, change-type chips row
import { useRef, useEffect, useState } from 'react';
import { useSelection }         from '../../hooks/use-selection.js';
import { useBulkActions }       from '../../hooks/use-bulk-actions.js';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { ENTRY_TYPES }          from '../../constants/entry-types.js';

export function BulkActionBar({ visibleIds, referenceVisibleIds = [] }) {
  const {
    selectedCount,
    hasSelection,
    selectionSide,
    clearSelection,
    selectAllVisible,
    exitSelectMode,
  } = useSelection();
  const { applyTypeChange, copyToOtherPanel } = useBulkActions();
  const { crosstalkEnabled, referenceLorebook } = useReferenceLorebook();

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
    // "Select All Visible" follows the side the user is already selecting from
    // so it doesn't yank the selection across panels. Default to active when
    // the selection is still empty (no side committed yet).
    const side = selectionSide ?? 'active';
    const ids  = side === 'reference' ? referenceVisibleIds : visibleIds;
    selectAllVisible(ids, side);
  }

  function onApply(typeId) {
    applyTypeChange(typeId);
    setChipsOpen(false);
  }

  function onCopyToOtherPanel() {
    copyToOtherPanel();
    setChipsOpen(false);
  }

  // Copy button only appears in crosstalk with both books available. Label
  // tracks the source side so the destination is always the *other* panel.
  const showCopyBtn = crosstalkEnabled && !!referenceLorebook;
  const copyLabel = selectionSide === 'reference'
    ? 'Copy to Active'
    : selectionSide === 'active'
      ? 'Copy to Reference'
      : 'Copy to other panel';
  const copyDisabled = !hasSelection || !selectionSide;
  const selectAllDisabled = (selectionSide === 'reference' ? referenceVisibleIds : visibleIds).length === 0;

  return (
    <div className="bulk-action-bar" ref={barRef}>
      <button className="bulk-action-btn bulk-action-btn--exit" onClick={onExit} title="Exit select mode">
        × Exit
      </button>
      <button
        className="bulk-action-btn"
        onClick={onSelectAllVisible}
        disabled={selectAllDisabled}
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

      {showCopyBtn && (
        <button
          className="bulk-action-apply"
          onClick={onCopyToOtherPanel}
          disabled={copyDisabled}
          title={selectionSide
            ? `Copy ${selectedCount} entr${selectedCount === 1 ? 'y' : 'ies'} to the ${selectionSide === 'active' ? 'reference' : 'active'} lorebook`
            : 'Select entries first'}
        >
          {copyLabel}
        </button>
      )}

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

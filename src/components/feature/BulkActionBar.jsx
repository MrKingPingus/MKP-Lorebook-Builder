// Row of bulk actions shown while searchMode === 'select' — exit, select-all-visible, change-type chips row
import { useRef, useEffect, useState } from 'react';
import { useSelection }            from '../../hooks/use-selection.js';
import { useBulkActions }          from '../../hooks/use-bulk-actions.js';
import { useReferenceLorebook }    from '../../hooks/use-reference-lorebook.js';
import { useMobile }               from '../../hooks/use-mobile.js';
import { usePickFromReference }    from '../../hooks/use-pick-from-reference.js';
import { ENTRY_TYPES }             from '../../constants/entry-types.js';

export function BulkActionBar({ visibleIds, referenceVisibleIds = [] }) {
  const {
    selectedCount,
    hasSelection,
    selectionSide,
    stagedCount,
    hasStaged,
    clearSelection,
    selectAllVisible,
    exitSelectMode,
  } = useSelection();
  const { applyTypeChange, applyStagedTypes, copyToOtherPanel, setHiddenForSelected } = useBulkActions();
  const { crosstalkEnabled, referenceLorebook } = useReferenceLorebook();
  const isMobile = useMobile();
  const { pickFromReferenceMode, enterPickFromReference, exitPickFromReference } = usePickFromReference();

  const [chipsOpen, setChipsOpen] = useState(false);
  // Visibility (Hide-from-Export) expander — mutually exclusive with the
  // Change-Type chips so only one picker row is open at a time.
  const [visOpen, setVisOpen] = useState(false);
  const barRef = useRef(null);

  // Close either chips row on outside click (clicks inside the bar — including on buttons — keep it open)
  useEffect(() => {
    if (!chipsOpen && !visOpen) return;
    function onMouseDown(e) {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setChipsOpen(false);
        setVisOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [chipsOpen, visOpen]);

  function onExit() {
    setChipsOpen(false);
    setVisOpen(false);
    if (pickFromReferenceMode) {
      // In pose, "× Exit" reads as Cancel — swap back, abandon picks.
      exitPickFromReference(false);
    } else {
      exitSelectMode();
    }
  }

  function onEnterPick() {
    setChipsOpen(false);
    enterPickFromReference();
  }

  function onCommitPick() {
    setChipsOpen(false);
    exitPickFromReference(true);
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

  function onApplyVisibility(hidden) {
    setHiddenForSelected(hidden);
    setVisOpen(false);
  }

  function onApplyStaged() {
    applyStagedTypes();
    setChipsOpen(false);
  }

  function onCopyToOtherPanel() {
    copyToOtherPanel();
    setChipsOpen(false);
  }

  // Existing cross-pane copy button. Desktop: shows when crosstalk paired.
  // Mobile: hidden outside pose since the reference book isn't visible to
  // select from there (push is deferred — see Phase 5 plan); inside pose
  // the dedicated "Copy & Done" commit replaces it.
  const showCopyBtn = crosstalkEnabled && !!referenceLorebook && !isMobile;
  const copyLabel = selectionSide === 'reference'
    ? 'Copy to Active'
    : selectionSide === 'active'
      ? 'Copy to Reference'
      : 'Copy to other panel';
  const copyDisabled = !hasSelection || !selectionSide;
  const selectAllDisabled = (selectionSide === 'reference' ? referenceVisibleIds : visibleIds).length === 0;

  // Pick-from-Reference entry point — mobile + crosstalk paired + outside pose.
  const showPickEntry = isMobile && crosstalkEnabled && !!referenceLorebook && !pickFromReferenceMode;
  // Commit button — mobile + inside pose.
  const showCommit    = isMobile && pickFromReferenceMode;

  return (
    <div className="bulk-action-bar" ref={barRef}>
      {/* ── Apply cluster — left, adjacent to the entry-type column ── */}
      <button
        className="bulk-action-apply"
        onClick={() => { setVisOpen(false); setChipsOpen((v) => !v); }}
        disabled={!hasSelection}
      >
        Change Type… {chipsOpen ? '▴' : '▾'}
      </button>

      <button
        className="bulk-action-apply bulk-action-apply--visibility"
        onClick={() => { setChipsOpen(false); setVisOpen((v) => !v); }}
        disabled={!hasSelection}
        title="Hide the selected entries from export, or show them again"
      >
        Set Visibility… {visOpen ? '▴' : '▾'}
      </button>

      {hasStaged && (
        <button
          className="bulk-action-apply bulk-action-apply--staged"
          onClick={onApplyStaged}
          title={`Apply ${stagedCount} per-row staged type change${stagedCount === 1 ? '' : 's'}`}
        >
          Apply Staged ({stagedCount})
        </button>
      )}

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

      {showPickEntry && (
        <button
          className="bulk-action-apply bulk-action-apply--pick-entry"
          onClick={onEnterPick}
          title={`Browse ${referenceLorebook?.name || 'the reference lorebook'} to multi-select entries to copy here`}
          type="button"
        >
          Copy From Reference
        </button>
      )}

      {showCommit && (
        <button
          className="bulk-action-apply bulk-action-apply--commit"
          onClick={onCommitPick}
          disabled={!hasSelection}
          title={hasSelection ? `Copy ${selectedCount} entr${selectedCount === 1 ? 'y' : 'ies'} into the original active lorebook and exit pose` : 'Select entries first'}
          type="button"
        >
          Copy &amp; Done
        </button>
      )}

      {/* ── Count + navigation cluster — right (margin-left:auto on count) ── */}
      <span className="bulk-action-count">{selectedCount} selected</span>

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
      <button
        className="bulk-action-btn bulk-action-btn--exit"
        onClick={onExit}
        title={pickFromReferenceMode ? 'Cancel pick — discard selections and swap back' : 'Exit select mode'}
      >
        × {pickFromReferenceMode ? 'Cancel' : 'Exit'}
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

      {visOpen && (
        <div className="bulk-action-chips">
          <button
            className="bulk-type-chip"
            style={{ '--type-color': 'var(--red)' }}
            onClick={() => onApplyVisibility(true)}
            title="Exclude the selected entries from every export"
          >
            Hidden
          </button>
          <button
            className="bulk-type-chip"
            style={{ '--type-color': 'var(--green)' }}
            onClick={() => onApplyVisibility(false)}
            title="Include the selected entries in exports again"
          >
            Shown
          </button>
        </div>
      )}
    </div>
  );
}

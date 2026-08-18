// Row of bulk actions shown while searchMode === 'select' — exit, select-all-visible, change-type chips row
import { useRef, useEffect, useState } from 'react';
import { useSelection }            from '../../hooks/use-selection.js';
import { useBulkActions }          from '../../hooks/use-bulk-actions.js';
import { useReferenceLorebook }    from '../../hooks/use-reference-lorebook.js';
import { useMobile }               from '../../hooks/use-mobile.js';
import { usePickFromReference }    from '../../hooks/use-pick-from-reference.js';
import { useFolders }              from '../../hooks/use-folders.js';
import { ENTRY_TYPES }             from '../../constants/entry-types.js';
import { NO_FOLDER_LABEL, NEW_FOLDER_NAME } from '../../constants/folders.js';

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
  const {
    applyTypeChange, applyStagedTypes, copyToOtherPanel,
    setHiddenForSelected, setPublicForSelected,
    moveSelectedToFolder, moveSelectedToNewFolder,
  } = useBulkActions();
  const { crosstalkEnabled, referenceLorebook } = useReferenceLorebook();
  const { folders, foldersSuppressed } = useFolders();
  const isMobile = useMobile();
  const { pickFromReferenceMode, enterPickFromReference, exitPickFromReference } = usePickFromReference();

  // Which picker row (if any) is expanded: 'type' | 'public' | 'hide'.
  // Only one is ever open at a time — opening one closes the others.
  const [openPicker, setOpenPicker] = useState(null);
  const togglePicker = (name) => setOpenPicker((cur) => (cur === name ? null : name));
  // Mobile only — the Actions menu that stands in for the flat bar's buttons.
  const [menuOpen, setMenuOpen] = useState(false);
  const barRef = useRef(null);

  // Close the open chips row (and the mobile menu) on outside click. Clicks
  // inside the bar — including on its buttons — keep it open.
  useEffect(() => {
    if (!openPicker && !menuOpen) return undefined;
    function onMouseDown(e) {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenPicker(null);
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openPicker, menuOpen]);

  function onExit() {
    setOpenPicker(null);
    if (pickFromReferenceMode) {
      // In pose, "× Exit" reads as Cancel — swap back, abandon picks.
      exitPickFromReference(false);
    } else {
      exitSelectMode();
    }
  }

  function onEnterPick() {
    setOpenPicker(null);
    enterPickFromReference();
  }

  function onCommitPick() {
    setOpenPicker(null);
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
    setOpenPicker(null);
  }

  function onApplyVisibility(hidden) {
    setHiddenForSelected(hidden);
    setOpenPicker(null);
  }

  function onApplyPublic(makePublic) {
    setPublicForSelected(makePublic);
    setOpenPicker(null);
  }

  function onApplyFolder(folderId) {
    moveSelectedToFolder(folderId);
    setOpenPicker(null);
  }

  function onApplyNewFolder() {
    moveSelectedToNewFolder();
    setOpenPicker(null);
  }

  function onApplyStaged() {
    applyStagedTypes();
    setOpenPicker(null);
  }

  function onCopyToOtherPanel() {
    copyToOtherPanel();
    setOpenPicker(null);
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

  /** The chip row for whichever picker is open. One definition, both layouts —
   *  mobile reaches these through the Actions menu and desktop through the flat
   *  bar's four buttons, but what opens is the same list either way. */
  function chipsFor(picker) {
    if (picker === 'type') {
      return ENTRY_TYPES.map((t) => (
        <button
          key={t.id}
          className="bulk-type-chip"
          style={{ '--type-color': t.color }}
          onClick={() => onApply(t.id)}
        >
          {t.label}
        </button>
      ));
    }
    if (picker === 'public') {
      return (
        <>
          <button
            className="bulk-type-chip"
            style={{ '--type-color': 'var(--muted2)' }}
            onClick={() => onApplyPublic(true)}
            title="Mark the selected entries Public on CharSnap"
          >
            Public
          </button>
          <button
            className="bulk-type-chip"
            style={{ '--type-color': 'var(--passive-agree)' }}
            onClick={() => onApplyPublic(false)}
            title="Mark the selected entries Private on CharSnap"
          >
            Private
          </button>
        </>
      );
    }
    if (picker === 'folder') {
      return (
        <>
          <button
            className="bulk-type-chip"
            style={{ '--type-color': 'var(--muted2)' }}
            onClick={() => onApplyFolder(null)}
            title="Take the selected entries out of any folder"
          >
            {NO_FOLDER_LABEL}
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className="bulk-type-chip bulk-type-chip--folder"
              style={{ '--type-color': f.color }}
              onClick={() => onApplyFolder(f.id)}
              title={`Move the selected entries into "${f.name || NEW_FOLDER_NAME}"`}
            >
              {f.name || NEW_FOLDER_NAME}
            </button>
          ))}
          <button
            className="bulk-type-chip bulk-type-chip--new-folder"
            onClick={onApplyNewFolder}
            title="Create a folder and move the selected entries into it"
          >
            ＋ New folder
          </button>
        </>
      );
    }
    if (picker === 'hide') {
      return (
        <>
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
        </>
      );
    }
    return null;
  }

  // ── Mobile: a count and one menu ────────────────────────────────────────
  //
  // The flat bar is ten controls and 891px of content in a 336px row — three
  // wrapped lines, 132px tall, and the single biggest reason select mode showed
  // two entries where search mode showed four.
  //
  // The four "Change Type… / Set Public/Private… / Hide from Export… / Move to
  // folder…" buttons are one control four times: each opens a chip row and sets
  // one field. So they collapse behind a labelled Actions menu, together with
  // the two selection commands. Picking one opens the same chip row as before.
  //
  // The count stays visible as a readout rather than becoming the menu's label:
  // a label describing *state* does not tell anyone how to act on that state,
  // which is the whole reason there is a button next to it saying "Actions".
  //
  // `× Exit` is gone here — the mode select beside this is the exit, and two
  // controls for one action is what this pass is removing.
  if (isMobile) {
    const actions = [
      { id: 'select-all', label: 'Select all visible', run: onSelectAllVisible, disabled: selectAllDisabled },
      { id: 'deselect',   label: 'Deselect all',       run: clearSelection,     disabled: !hasSelection },
      { divider: true },
      { id: 'type',    label: 'Change type…',       run: () => togglePicker('type'),   disabled: !hasSelection },
      { id: 'public',  label: 'Set public/private…', run: () => togglePicker('public'), disabled: !hasSelection },
      { id: 'hide',    label: 'Hide from export…',   run: () => togglePicker('hide'),   disabled: !hasSelection },
      { id: 'folder',  label: 'Move to folder…',     run: () => togglePicker('folder'),
        disabled: !hasSelection || selectionSide === 'reference' || foldersSuppressed },
      ...(hasStaged ? [{ id: 'staged', label: `Apply ${stagedCount} staged type change${stagedCount === 1 ? '' : 's'}`, run: onApplyStaged }] : []),
      ...(showPickEntry ? [{ id: 'pick', label: 'Copy from reference', run: onEnterPick }] : []),
      ...(showCommit ? [{ id: 'commit', label: `Copy ${selectedCount} & done`, run: onCommitPick, disabled: !hasSelection }] : []),
    ];

    return (
      <div className="bulk-action-bar bulk-action-bar--mobile" ref={barRef}>
        <span className="bulk-count-readout">
          <span aria-hidden="true">✓</span>
          <span className="bulk-count-num">{selectedCount}</span>
          {/* Dropped by a container query at the tightest row width — four
              controls and the full phrase do not fit 360px, and losing a word
              beats ellipsising a readout into "128 select…". */}
          <span className="bulk-count-word">selected</span>
        </span>

        <button
          type="button"
          className={`bulk-actions-btn touch-floor${menuOpen ? ' bulk-actions-btn--open' : ''}`}
          onClick={() => { setOpenPicker(null); setMenuOpen((v) => !v); }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          Actions <span aria-hidden="true">▾</span>
        </button>

        {menuOpen && (
          <div className="bulk-actions-menu" role="menu">
            {actions.map((a, i) => (a.divider ? (
              <div key={`d${i}`} className="bulk-actions-menu-divider" role="separator" />
            ) : (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                className="bulk-actions-menu-item"
                disabled={a.disabled}
                onClick={() => { setMenuOpen(false); a.run(); }}
              >
                {a.label}
              </button>
            )))}
          </div>
        )}

        {openPicker && <div className="bulk-action-chips">{chipsFor(openPicker)}</div>}
      </div>
    );
  }

  return (
    <div className="bulk-action-bar" ref={barRef}>
      {/* ── Apply cluster — left, adjacent to the entry-type column ── */}
      <button
        className="bulk-action-apply"
        onClick={() => togglePicker('type')}
        disabled={!hasSelection}
      >
        Change Type… {openPicker === 'type' ? '▴' : '▾'}
      </button>

      <button
        className="bulk-action-apply bulk-action-apply--secondary"
        onClick={() => togglePicker('public')}
        disabled={!hasSelection}
        title="Make the selected entries Public or Private on CharSnap"
      >
        Set Public/Private… {openPicker === 'public' ? '▴' : '▾'}
      </button>

      <button
        className="bulk-action-apply bulk-action-apply--secondary"
        onClick={() => togglePicker('hide')}
        disabled={!hasSelection}
        title="Hide the selected entries from export, or show them again"
      >
        Hide from Export… {openPicker === 'hide' ? '▴' : '▾'}
      </button>

      <button
        className="bulk-action-apply bulk-action-apply--secondary"
        onClick={() => togglePicker('folder')}
        disabled={!hasSelection || selectionSide === 'reference' || foldersSuppressed}
        title={selectionSide === 'reference'
          ? 'Folders belong to the active lorebook — swap this book into the active slot to file its entries'
          : foldersSuppressed
            ? 'Folders are hidden while sorting by cross-book matches — switch sort to use them'
            : 'Move the selected entries into a folder'}
      >
        Move to folder… {openPicker === 'folder' ? '▴' : '▾'}
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

      {openPicker && <div className="bulk-action-chips">{chipsFor(openPicker)}</div>}
    </div>
  );
}

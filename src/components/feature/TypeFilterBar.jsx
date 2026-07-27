// Filter bar: type pills, Group by type toggle (mobile inline), Expand All and
// New Folder (desktop only).
// On mobile the type pills + Group-by-type are collapsed into a single "Filter ▾"
// button that opens a popover with checkboxes — saves two rows of vertical chrome.
import { useState, useRef, useEffect } from 'react';
import { createPortal }    from 'react-dom';
import { ENTRY_TYPES }     from '../../constants/entry-types.js';
import { useTypeFilter }   from '../../hooks/use-type-filter.js';
import { useUi }           from '../../hooks/use-ui.js';
import { useMobile }       from '../../hooks/use-mobile.js';
import { useFolders }      from '../../hooks/use-folders.js';
import { useFolderFilter }  from '../../hooks/use-folder-filter.js';
import { FolderFilterButton, FolderFilterRows } from './FolderFilterButton.jsx';

export function TypeFilterBar({ entries }) {
  const { typeFilter, toggleTypeFilter, clearFilter } = useTypeFilter(entries);
  const bulkExpanded       = useUi((s) => s.bulkExpanded);
  const groupByType        = useUi((s) => s.groupByType);
  const expandAllEntries   = useUi((s) => s.expandAllEntries);
  const collapseAllEntries = useUi((s) => s.collapseAllEntries);
  const setGroupByType     = useUi((s) => s.setGroupByType);
  const isMobile           = useMobile();
  const { createFolder, foldersSuppressed, hasFolders, allFoldersTucked, toggleAllFolders } = useFolders();
  const { folderFilter, hasFolders: hasFoldersToFilter } = useFolderFilter();

  function handleTypeClick(e, typeId) {
    if (e.shiftKey) {
      toggleTypeFilter(typeId);
    } else {
      if (typeFilter.length === 1 && typeFilter[0] === typeId) {
        clearFilter();
      } else {
        const { setTypeFilter } = useUi.getState();
        setTypeFilter([typeId]);
      }
    }
  }

  // === Mobile: collapsed Filter ▾ button + popover ===
  const [open, setOpen]     = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    // Consume Escape (document fires before the window dispatcher) so it closes
    // this popover only, not a dismissable mode beneath it.
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function openPopover() {
    setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
    setOpen(true);
  }

  if (isMobile) {
    // Two counts: the button badge sums both dimensions, but the "All types"
    // row must reflect the type filter alone or a folder selection would
    // wrongly un-check it.
    const typeCount   = typeFilter.length;
    const filterCount = typeCount + folderFilter.length;
    const summary = filterCount === 0
      ? (groupByType ? 'Filter · Grouped' : 'Filter')
      : `Filter (${filterCount})${groupByType ? ' · Grouped' : ''}`;
    const isActive = filterCount > 0 || groupByType;
    return (
      <div className="type-filter-bar type-filter-bar--mobile">
        <button
          ref={btnRef}
          className={`type-filter-button${isActive ? ' type-filter-button--active' : ''}`}
          onClick={openPopover}
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
        >
          {summary} <span className="type-filter-button-chevron">▾</span>
        </button>
        {open && createPortal(
          <>
            <div className="popover-backdrop" onClick={() => setOpen(false)} />
            <div
              className="type-filter-popover"
              style={{
                position: 'fixed',
                top:  (anchor?.bottom ?? 0) + 6,
                left: Math.max(8, Math.min((anchor?.left ?? 0), window.innerWidth - 240)),
              }}
            >
              <div className="type-filter-popover-section">
                <button
                  className={`type-filter-popover-row${typeCount === 0 ? ' type-filter-popover-row--active' : ''}`}
                  onClick={clearFilter}
                  type="button"
                >
                  <span className="type-filter-popover-check">{typeCount === 0 ? '✓' : ''}</span>
                  <span className="type-filter-popover-label">All types</span>
                </button>
                {ENTRY_TYPES.map((t) => {
                  const active = typeFilter.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      className={`type-filter-popover-row${active ? ' type-filter-popover-row--active' : ''}`}
                      onClick={() => toggleTypeFilter(t.id)}
                      type="button"
                    >
                      <span className="type-filter-popover-check">{active ? '✓' : ''}</span>
                      <span className="type-filter-popover-swatch" style={{ background: t.color }} />
                      <span className="type-filter-popover-label">{t.label}</span>
                    </button>
                  );
                })}
              </div>
              {hasFoldersToFilter && (
                <>
                  <div className="type-filter-popover-divider" />
                  <div className="type-filter-popover-section">
                    <FolderFilterRows />
                  </div>
                </>
              )}
              <div className="type-filter-popover-divider" />
              <div className="type-filter-popover-section">
                <button
                  className={`type-filter-popover-row${groupByType ? ' type-filter-popover-row--active' : ''}`}
                  onClick={() => setGroupByType(!groupByType)}
                  type="button"
                >
                  <span className="type-filter-popover-check">{groupByType ? '✓' : ''}</span>
                  <span className="type-filter-popover-label">Group by type</span>
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
      </div>
    );
  }

  // === Desktop: original inline pills ===
  return (
    <div className="type-filter-bar">
      {/* All pill */}
      <button
        className={`type-pill${typeFilter.length === 0 ? ' type-pill--active' : ''}`}
        onClick={clearFilter}
        title="Shift+click for multi-select"
      >
        All
      </button>

      {/* Per-type pills */}
      {ENTRY_TYPES.map((t) => {
        const active = typeFilter.includes(t.id);
        return (
          <button
            key={t.id}
            className={`type-pill${active ? ' type-pill--active' : ''}`}
            style={active ? { borderColor: t.color, color: t.color, background: `${t.color}1a` } : {}}
            onClick={(e) => handleTypeClick(e, t.id)}
            title="Shift+click for multi-select"
          >
            {t.label}
          </button>
        );
      })}

      {/* Group by type — inline pill on mobile; desktop keeps it in the filter row too */}
      <button
        className={`type-pill type-pill--dashed${groupByType ? ' type-pill--dashed-active' : ''}`}
        onClick={() => setGroupByType(!groupByType)}
      >
        Group by type
      </button>

      {/* Folder ▾ — self-hiding until the book has folders */}
      <FolderFilterButton />

      {/* Expand All / Collapse All — desktop only (mobile uses slide-in detail panel) */}
      {!isMobile && (
        <button
          className="filter-action-btn"
          onClick={bulkExpanded ? collapseAllEntries : expandAllEntries}
        >
          {bulkExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      )}

      {/* Global folder collapse — only worth a slot once folders exist */}
      {!isMobile && hasFolders && !foldersSuppressed && (
        <button
          className="filter-action-btn"
          onClick={toggleAllFolders}
          title={allFoldersTucked
            ? 'Open every folder back to full size'
            : 'Tuck every folder shut'}
        >
          {allFoldersTucked ? 'Open Folders' : 'Collapse Folders'}
        </button>
      )}

      {/* New folder — desktop only; folders on mobile are a separate design */}
      {!isMobile && (
        <button
          className="filter-action-btn"
          onClick={() => createFolder()}
          disabled={foldersSuppressed}
          title={foldersSuppressed
            ? 'Folders are hidden while sorting by cross-book matches — switch sort to use them'
            : "Create an empty folder — drop entries into it from a card's Move to folder button or a select-mode bulk move"}
        >
          ＋ Folder
        </button>
      )}
    </div>
  );
}

// Folder ▾ — narrows the list to one or more folders. Renders only once the
// active book actually has folders, so a user who never made one sees no extra
// chrome in an already-busy filter bar.
//
// `FolderFilterRows` is the shared checkbox list: this file's desktop popover
// uses it, and TypeFilterBar drops it into the mobile Filter ▾ popover so the
// small screen gains the feature without gaining a button.
import { useState, useRef, useEffect } from 'react';
import { createPortal }    from 'react-dom';
import { useFolderFilter } from '../../hooks/use-folder-filter.js';
import {
  UNFILED_FILTER_ID,
  UNFILED_FILTER_LABEL,
  ALL_FOLDERS_LABEL,
  FOLDER_FILTER_LABEL,
} from '../../constants/folders.js';

// One level of nesting is worth about this much indent in a menu row — enough
// to read the hierarchy, small enough that a depth-3 folder keeps its name.
const MENU_INDENT_PX = 12;

export function FolderFilterRows() {
  const { folderFilter, folderOptions, toggleFolderFilter, clearFolderFilter } = useFolderFilter();
  const none = folderFilter.length === 0;

  return (
    <>
      <button
        className={`type-filter-popover-row${none ? ' type-filter-popover-row--active' : ''}`}
        onClick={clearFolderFilter}
        type="button"
      >
        <span className="type-filter-popover-check">{none ? '✓' : ''}</span>
        <span className="type-filter-popover-label">{ALL_FOLDERS_LABEL}</span>
      </button>

      {folderOptions.map((f) => {
        const active = folderFilter.includes(f.id);
        return (
          <button
            key={f.id}
            className={`type-filter-popover-row${active ? ' type-filter-popover-row--active' : ''}`}
            onClick={() => toggleFolderFilter(f.id)}
            type="button"
          >
            <span className="type-filter-popover-check">{active ? '✓' : ''}</span>
            <span
              className="type-filter-popover-swatch"
              style={{ background: f.color, marginLeft: f.depth * MENU_INDENT_PX }}
            />
            <span className="type-filter-popover-label">{f.name}</span>
            <span className="folder-filter-count">{f.count}</span>
          </button>
        );
      })}

      <div className="type-filter-popover-divider" />

      <button
        className={`type-filter-popover-row${folderFilter.includes(UNFILED_FILTER_ID) ? ' type-filter-popover-row--active' : ''}`}
        onClick={() => toggleFolderFilter(UNFILED_FILTER_ID)}
        type="button"
        title="Entries that aren't in any folder yet"
      >
        <span className="type-filter-popover-check">
          {folderFilter.includes(UNFILED_FILTER_ID) ? '✓' : ''}
        </span>
        <span className="type-filter-popover-label">{UNFILED_FILTER_LABEL}</span>
      </button>
    </>
  );
}

export function FolderFilterButton() {
  const { folderFilter, hasFolders } = useFolderFilter();
  const [open, setOpen]     = useState(false);
  const [anchor, setAnchor] = useState(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // Consume Escape here (document fires before the window dispatcher) so it
    // shuts this popover only, not a dismissable mode underneath it.
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!hasFolders) return null;

  const count  = folderFilter.length;
  const active = count > 0;
  const label  = active ? `${FOLDER_FILTER_LABEL} (${count})` : FOLDER_FILTER_LABEL;

  return (
    <>
      <button
        ref={btnRef}
        className={`type-pill type-pill--dashed folder-filter-btn${active ? ' type-pill--dashed-active' : ''}`}
        onClick={() => {
          setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
          setOpen((v) => !v);
        }}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        title="Show only entries in the folders you pick"
      >
        {label} <span className="type-filter-button-chevron">▾</span>
      </button>

      {open && createPortal(
        <>
          <div className="popover-backdrop" onClick={() => setOpen(false)} />
          <div
            className="type-filter-popover folder-filter-popover"
            style={{
              position: 'fixed',
              top:  (anchor?.bottom ?? 0) + 6,
              left: Math.max(8, Math.min((anchor?.left ?? 0), window.innerWidth - 260)),
            }}
          >
            <div className="type-filter-popover-section">
              <FolderFilterRows />
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

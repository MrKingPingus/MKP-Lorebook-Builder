// Per-entry folder control in the entry-card footer. Shows the entry's current
// folder (or the generic label when it's top-level) and opens a menu to move it
// somewhere else, unfile it, or drop it into a brand-new folder.
import { useState, useRef, useEffect } from 'react';
import { useFolders }       from '../../hooks/use-folders.js';
import { useDismissLayer }  from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { NO_FOLDER_LABEL, NEW_FOLDER_NAME } from '../../constants/folders.js';

export function MoveToFolderButton({ entry }) {
  const { folders, moveEntryToFolder, createFolderWithEntries, foldersSuppressed } = useFolders();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const current = folders.find((f) => f.id === entry.folderId) ?? null;

  useDismissLayer(`move-to-folder-${entry.id}`, open, DISMISS_PRIORITY.popover, () => setOpen(false));

  useEffect(() => {
    if (!open) return undefined;
    function onMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function move(folderId) {
    moveEntryToFolder(entry.id, folderId);
    setOpen(false);
  }

  function moveToNew() {
    createFolderWithEntries([entry.id]);
    setOpen(false);
  }

  return (
    <div className="move-to-folder" ref={rootRef}>
      <button
        className={`move-to-folder-btn${current ? ' move-to-folder-btn--filed' : ''}`}
        style={current ? { '--folder-color': current.color } : undefined}
        onClick={() => setOpen((o) => !o)}
        disabled={foldersSuppressed}
        title={foldersSuppressed
          ? 'Folders are hidden while sorting by cross-book matches — switch sort to use them'
          : current ? `In folder "${current.name || NEW_FOLDER_NAME}" — click to move` : 'Move this entry into a folder'}
        type="button"
      >
        {current ? `🗀 ${current.name || NEW_FOLDER_NAME}` : 'Move to folder'} {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="move-to-folder-menu">
          <button
            className={`move-to-folder-item${!current ? ' move-to-folder-item--active' : ''}`}
            onClick={() => move(null)}
            type="button"
          >
            {NO_FOLDER_LABEL}
          </button>

          {folders.map((f) => (
            <button
              key={f.id}
              className={`move-to-folder-item${f.id === entry.folderId ? ' move-to-folder-item--active' : ''}`}
              onClick={() => move(f.id)}
              type="button"
            >
              <span className="move-to-folder-dot" style={{ background: f.color }} />
              {f.name || NEW_FOLDER_NAME}
            </button>
          ))}

          <div className="move-to-folder-divider" />
          <button className="move-to-folder-item" onClick={moveToNew} type="button">
            ＋ New folder
          </button>
        </div>
      )}
    </div>
  );
}

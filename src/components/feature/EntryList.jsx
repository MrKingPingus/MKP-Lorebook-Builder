// Scrollable sortable list of EntryCard components with drag-and-drop reorder
// support (desktop only), rendered through the folder walk: folders appear at
// the position of their first member and swallow all of it, loose entries stay
// interleaved around them.
import { useRef, useEffect } from 'react';
import { EntryCard }     from './EntryCard.jsx';
import { FolderHeader }  from './FolderHeader.jsx';
import { useEntries }    from '../../hooks/use-entries.js';
import { useFolders }    from '../../hooks/use-folders.js';
import { useKeybindings } from '../../hooks/use-keybindings.js';
import { useUi }         from '../../hooks/use-ui.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { buildRenderItems } from '../../services/folder-tree.js';
import { ENTRY_TYPES }   from '../../constants/entry-types.js';
import { COLLAPSE_STATES } from '../../constants/folders.js';

export function EntryList({ entries, groupByType }) {
  const { updateEntry, removeEntry, reorderEntriesById } = useEntries();
  const { folders } = useFolders();
  const { displayChord } = useKeybindings();
  const isMobile    = useMobile();
  const sortMode    = useUi((s) => s.sortMode);
  const searchQuery = useUi((s) => s.searchQuery);
  const dragId           = useRef(null);
  const lastOverId       = useRef(null);
  const isDragFromHandle = useRef(false);

  // Reset the drag-handle flag on every mouseup so stale state can't bleed into the next gesture
  useEffect(() => {
    function resetFlag() { isDragFromHandle.current = false; }
    window.addEventListener('mouseup', resetFlag);
    return () => window.removeEventListener('mouseup', resetFlag);
  }, []);

  const renderItems = buildRenderItems(entries, folders, {
    // An empty folder can't anchor to a member, so it would otherwise trail
    // every search as a row of noise. Hide those while a search is narrowing
    // the list; they come back the moment the query clears.
    hideEmptyFolders: searchQuery.trim().length > 0,
  });

  if (renderItems.length === 0) {
    return (
      <div className="entry-list-empty">
        No entries yet. Press {displayChord('new_entry')} or click + to add one.
      </div>
    );
  }

  // Drag moves entries by id — the rendered order is a transform of entries[],
  // so a rendered position is not an array position (see reorderEntriesById).
  // `lastOverId` latches the card we most recently swapped past: without it the
  // repeated dragover events over that same card would swap the pair back and
  // forth on every mouse tick.
  function onDragOver(e, overId) {
    e.preventDefault();
    if (dragId.current === null || dragId.current === overId) return;
    if (lastOverId.current === overId) return;
    reorderEntriesById(dragId.current, overId);
    lastOverId.current = overId;
  }

  const dragDisabled = isMobile || sortMode !== 'default';

  function renderEntry(entry, position) {
    const dragProps = dragDisabled ? {} : {
      draggable: true,
      onDragStart: (e) => {
        if (!isDragFromHandle.current) { e.preventDefault(); return; }
        dragId.current = entry.id;
        lastOverId.current = null;
      },
      onDragOver: (e) => onDragOver(e, entry.id),
      onDragEnd:  () => { dragId.current = null; lastOverId.current = null; isDragFromHandle.current = false; },
    };

    return (
      <div key={entry.id} {...dragProps} className="entry-list-item">
        <EntryCard
          entry={entry}
          index={position}
          onUpdate={updateEntry}
          onRemove={removeEntry}
          onDragHandleMouseDown={dragDisabled ? undefined : () => { isDragFromHandle.current = true; }}
        />
      </div>
    );
  }

  const items = [];
  let position = 0;   // running 1-based badge number, following what's on screen
  let lastType = null;

  renderItems.forEach((item) => {
    if (item.kind === 'folder') {
      const { folder } = item;
      const tucked = folder.collapseState === COLLAPSE_STATES.TUCKED;
      items.push(
        <div
          key={`folder-${folder.id}`}
          className="folder-block"
          style={{ '--folder-color': folder.color }}
        >
          <FolderHeader folder={folder} count={item.entries.length} />
          {!tucked && (
            <div className="folder-entries">
              {item.entries.map((entry) => { position += 1; return renderEntry(entry, position); })}
            </div>
          )}
        </div>
      );
      // Tucked entries still occupy their numbers so badges don't renumber as
      // folders open and close.
      if (tucked) position += item.entries.length;
      // A folder breaks the top-level type run — the next loose entry of the
      // same type gets its header back.
      lastType = null;
      return;
    }

    const { entry } = item;
    // Type sub-headers inside folders are a later sub-phase; here they group
    // the top-level stream only.
    if (groupByType && entry.type !== lastType) {
      const typeDef = ENTRY_TYPES.find((t) => t.id === entry.type);
      items.push(
        <div
          key={`group-${entry.type}-${position}`}
          className="type-group-header"
          style={{ '--type-color': typeDef?.color ?? '#9ba1ad' }}
        >
          {typeDef?.label ?? entry.type}
        </div>
      );
      lastType = entry.type;
    }

    position += 1;
    items.push(renderEntry(entry, position));
  });

  // A book with folders but no entries still renders the folders — keep the
  // add-an-entry hint underneath them so the list is never a dead end.
  if (entries.length === 0) {
    items.push(
      <div key="entry-list-empty" className="entry-list-empty">
        No entries yet. Press {displayChord('new_entry')} or click + to add one.
      </div>
    );
  }

  return (
    <div className="entry-list">
      {items}
    </div>
  );
}

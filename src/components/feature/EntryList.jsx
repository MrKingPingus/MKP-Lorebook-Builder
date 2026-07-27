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
import { useFolderFilter } from '../../hooks/use-folder-filter.js';
import { useSelectionMacros } from '../../hooks/use-selection-macros.js';
import { buildRenderItems, effectiveCollapseState, flattenRenderItems } from '../../services/folder-tree.js';
import { ENTRY_TYPES }   from '../../constants/entry-types.js';
import { COLLAPSE_STATES } from '../../constants/folders.js';
import { folderOrderFor } from '../../constants/sort-modes.js';

export function EntryList({ entries, groupByType, showFolders = true }) {
  const { updateEntry, removeEntry, reorderEntriesById } = useEntries();
  const { folders } = useFolders();
  const { filterActive } = useFolderFilter();
  const { handleSelectionClick, selectFolderEntries } = useSelectionMacros();
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

  const searchActive = searchQuery.trim().length > 0;
  // A folder filter narrows the list the same way a search does, so it gets the
  // same two concessions: folders left with nothing drop out instead of showing
  // an empty header, and a tucked folder opens rather than hiding the very
  // entries the filter was asked to surface.
  const narrowed = searchActive || filterActive;

  // `showFolders` goes false under the cross-match sorts, where regrouping by
  // folder would break the matched/unmatched partition the sort exists to show.
  // Passing no folders renders every entry loose, in pure sort order.
  const renderTree = buildRenderItems(entries, showFolders ? folders : [], {
    // An empty folder can't anchor to a member, so it would otherwise trail
    // every search as a row of noise. Hide those while a search is narrowing
    // the list; they come back the moment the query clears.
    hideEmptyFolders: narrowed,
    // Alpha sorts order folder rows by folder name; everything else anchors a
    // folder at the earliest position in its subtree. See `folderOrderFor`.
    orderBy: folderOrderFor(sortMode),
  });

  // Display order, including entries tucked out of sight inside a collapsed
  // folder — they still sit between the endpoints of a shift+click range, so a
  // range can't silently mean something different depending on what happens to
  // be collapsed. The folder header reports how many of its hidden entries the
  // range caught.
  const orderedIds = flattenRenderItems(renderTree).map((e) => e.id);

  if (renderTree.length === 0) {
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

  function renderEntry(entry, position, density = 'full') {
    // A condensed row has no drag handle, so it can't start a drag either.
    const dragProps = (dragDisabled || density === 'condensed') ? {} : {
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
          onSelectionClick={(e) => handleSelectionClick(e, entry.id, 'active', orderedIds)}
          density={density}
          onDragHandleMouseDown={dragDisabled ? undefined : () => { isDragFromHandle.current = true; }}
        />
      </div>
    );
  }

  // Walk the render tree. `position` is a running badge number that follows
  // what's on screen, and `inherited` carries an ancestor's collapse state down
  // — a condensed parent compacts its subtree without writing to any child.
  let position = 0;

  function renderItems(list, inherited) {
    const out = [];
    let lastType = null;

    for (const item of list) {
      if (item.kind === 'folder') {
        const { folder } = item;
        const state  = effectiveCollapseState(inherited, folder.collapseState);
        const tucked = state === COLLAPSE_STATES.TUCKED && !narrowed;
        const density = state === COLLAPSE_STATES.CONDENSED ? 'condensed' : 'full';

        out.push(
          <div
            key={`folder-${folder.id}`}
            className="folder-block"
            style={{ '--folder-color': folder.color }}
          >
            <FolderHeader
              folder={folder}
              count={item.totalCount}
              effectiveState={state}
              entryIds={flattenRenderItems([item]).map((e) => e.id)}
              onFolderSelectionClick={selectFolderEntries}
            />
            {!tucked && item.children.length > 0 && (
              <div className="folder-entries">
                {renderItems(item.children, state)}
              </div>
            )}
          </div>
        );

        // Tucked entries still consume their numbers, so badges don't renumber
        // as folders open and close.
        if (tucked) position += item.totalCount;
        // A folder breaks the type run at this level — the next loose entry of
        // the same type gets its header back.
        lastType = null;
        continue;
      }

      const { entry } = item;
      // Type sub-headers group the entries at whatever level they sit — top
      // level, or inside a folder (plan decision 2).
      if (groupByType && entry.type !== lastType) {
        const typeDef = ENTRY_TYPES.find((t) => t.id === entry.type);
        out.push(
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
      out.push(renderEntry(entry, position, inherited === COLLAPSE_STATES.CONDENSED ? 'condensed' : 'full'));
    }

    return out;
  }

  const items = renderItems(renderTree, COLLAPSE_STATES.FULL);

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

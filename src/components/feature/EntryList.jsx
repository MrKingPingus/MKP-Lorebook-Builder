// Scrollable sortable list of EntryCard components with drag-and-drop reorder
// support (desktop only), rendered through the folder walk: folders appear at
// the position of their first member and swallow all of it, loose entries stay
// interleaved around them.
//
// Dragging shows an insertion indicator and commits once on release. The drop
// *position* decides the parent — between two rows inside a folder joins that
// folder, between two top-level rows leaves every folder, onto a folder header
// files into it — so one gesture writes order and `folderId` as a single
// undoable step. See services/drag-drop.js.
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
import { useEntryDrag }     from '../../hooks/use-entry-drag.js';
import { buildRenderItems, effectiveCollapseState, flattenRenderItems } from '../../services/folder-tree.js';
import { ENTRY_TYPES }   from '../../constants/entry-types.js';
import { COLLAPSE_STATES } from '../../constants/folders.js';
import { folderOrderFor } from '../../constants/sort-modes.js';

export function EntryList({ entries, groupByType, showFolders = true }) {
  const { updateEntry, removeEntry } = useEntries();
  const { folders, renderedCollapseState } = useFolders();
  const { filterActive } = useFolderFilter();
  const { handleSelectionClick, selectFolderEntries } = useSelectionMacros();
  const { displayChord } = useKeybindings();
  const isMobile    = useMobile();
  const sortMode    = useUi((s) => s.sortMode);
  const searchQuery = useUi((s) => s.searchQuery);
  const isDragFromHandle       = useRef(false);
  const isFolderDragFromHandle = useRef(false);
  const listRef                = useRef(null);
  const tailRef                = useRef(null);
  const drag = useEntryDrag(listRef);

  // Reset the drag-handle flag on every mouseup so stale state can't bleed into the next gesture
  useEffect(() => {
    function resetFlag() {
      isDragFromHandle.current = false;
      isFolderDragFromHandle.current = false;
    }
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

  // A non-default sort imposes its own order, so a manual reorder under one
  // would be immediately overwritten and read as the drag having failed.
  // Narrowing (search / type filter / folder filter) does *not* disable drag:
  // the splice resolves by id, so dropping between two visible rows means
  // exactly what it looks like even when rows between them are filtered out.
  const dragDisabled = isMobile || sortMode !== 'default';

  // Which half of the row the pointer is in decides before/after.
  function edgeFor(e) {
    const r = e.currentTarget.getBoundingClientRect();
    return (e.clientY - r.top) < r.height / 2 ? drag.DROP_EDGES.BEFORE : drag.DROP_EDGES.AFTER;
  }

  function indicatorClass(id) {
    const t = drag.dropTarget;
    if (!t || t.kind !== drag.DROP_KINDS.ENTRY || t.id !== id) return '';
    return t.edge === drag.DROP_EDGES.BEFORE ? ' entry-list-item--drop-before' : ' entry-list-item--drop-after';
  }

  function renderEntry(entry, position, density = 'full') {
    // A condensed row has no handle to grab, so the whole row starts a drag —
    // a condensed folder is exactly where bulk rearranging happens.
    const canDrag = !dragDisabled;
    const dragProps = !canDrag ? {} : {
      draggable: true,
      onDragStart: (e) => {
        if (density !== 'condensed' && !isDragFromHandle.current) { e.preventDefault(); return; }
        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        drag.startEntryDrag(entry.id, orderedIds);
      },
      onDragOver: (e) => {
        if (!drag.isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        drag.hoverTarget({ kind: drag.DROP_KINDS.ENTRY, id: entry.id, edge: edgeFor(e) }, e.clientY);
      },
      // preventDefault only. Letting `drop` reach the document matters for the
      // same reason `dragend` does — anything tracking the end of a drag from
      // above needs to see it. The container's own drop handler re-checks the
      // target, which is already cleared by the time it runs, so this can't
      // commit twice.
      onDrop: (e) => { e.preventDefault(); drag.commitDrop(); },
      // Deliberately NOT stopPropagation: `dragend` has to reach the document.
      // Anything watching there for the end of a drag — the window backstop
      // below, and the test harness's drag manager — otherwise never learns the
      // gesture finished and treats the next one as a drag still in progress.
      onDragEnd:  () => { drag.endDrag(); isDragFromHandle.current = false; },
    };

    return (
      <div
        key={entry.id}
        {...dragProps}
        className={`entry-list-item${drag.isDragged(entry.id) ? ' entry-list-item--dragging' : ''}${indicatorClass(entry.id)}`}
      >
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
        // Clamp the stored state through the active cycle *before* inheritance.
        // Without this a folder saved as condensed keeps rendering condensed
        // after that stage is switched off — the header glyph clamped, but the
        // rows underneath it did not, so the setting was only half render-level.
        const state  = effectiveCollapseState(inherited, renderedCollapseState(folder.collapseState));
        const tucked = state === COLLAPSE_STATES.TUCKED && !narrowed;
        const density = state === COLLAPSE_STATES.CONDENSED ? 'condensed' : 'full';

        const isDropFolder = drag.dropTarget?.kind === drag.DROP_KINDS.FOLDER
          && drag.dropTarget.id === folder.id;
        // The *header* is the drag source, not the block. Making the block
        // draggable would nest every entry row inside a draggable ancestor,
        // which stalls the browser's drag session outright — no entry inside a
        // folder could be dragged at all.
        const folderDragProps = dragDisabled ? {} : {
          draggable: true,
          onDragStart: (e) => {
            if (!isFolderDragFromHandle.current) { e.preventDefault(); return; }
            if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
            drag.startFolderDrag(folder.id);
          },
          onDragEnd: () => { drag.endDrag(); isFolderDragFromHandle.current = false; },
        };

        out.push(
          <div
            key={`folder-${folder.id}`}
            className={`folder-block${drag.draggingFolderId === folder.id ? ' folder-block--dragging' : ''}${isDropFolder ? ' folder-block--drop-into' : ''}`}
            style={{ '--folder-color': folder.color }}
          >
            <FolderHeader
              folder={folder}
              count={item.totalCount}
              effectiveState={state}
              entryIds={flattenRenderItems([item]).map((e) => e.id)}
              onFolderSelectionClick={selectFolderEntries}
              dragProps={folderDragProps}
              onDragHandleMouseDown={dragDisabled ? undefined : () => { isFolderDragFromHandle.current = true; }}
              onHeaderDragOver={dragDisabled ? undefined : (e) => {
                if (!drag.isDragging) return;
                e.preventDefault();
                e.stopPropagation();
                drag.hoverTarget({ kind: drag.DROP_KINDS.FOLDER, id: folder.id }, e.clientY);
              }}
              onHeaderDrop={dragDisabled ? undefined : (e) => {
                e.preventDefault();
                drag.commitDrop();
              }}
              isDropTarget={isDropFolder}
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

  // Run-off zone under the last row: the only way to express "top level, at the
  // very end" when the last row happens to live inside a folder.
  if (!dragDisabled) {
    items.push(
      <div
        key="entry-list-tail"
        ref={tailRef}
        className={`entry-list-tail${
          drag.dropTarget?.kind === drag.DROP_KINDS.ROOT_END ? ' entry-list-tail--active' : ''
        }${drag.isDragging ? ' entry-list-tail--armed' : ''}`}
        onDragOver={(e) => {
          if (!drag.isDragging) return;
          e.preventDefault();
          e.stopPropagation();
          // No clientY: resting on the tail shouldn't keep auto-scrolling, or
          // the zone slides out from under the pointer as it makes room.
          drag.hoverTarget({ kind: drag.DROP_KINDS.ROOT_END, id: null });
        }}
        onDrop={(e) => { e.preventDefault(); drag.commitDrop(); }}
      >
        {drag.isDragging ? 'Drop here to move out of every folder' : ''}
      </div>
    );
  }

  // Anything below the last row means "top level, at the end". This lives on
  // the container rather than only on the tail element because auto-scroll can
  // slide the tail up past the pointer as it makes room, leaving the pointer
  // over the container's own padding — the tail alone would be unreachable at
  // exactly the moment you were aiming for it. Rows and folder headers
  // stopPropagation on dragover, so this only ever sees unclaimed space.
  function onListDragOver(e) {
    if (!drag.isDragging) return;
    const tailTop = tailRef.current?.getBoundingClientRect().top;
    if (tailTop == null || e.clientY < tailTop) return;
    e.preventDefault();
    drag.hoverTarget({ kind: drag.DROP_KINDS.ROOT_END, id: null }, e.clientY);
  }

  return (
    <div
      className="entry-list"
      ref={listRef}
      onDragOver={onListDragOver}
      onDrop={(e) => {
        if (drag.dropTarget?.kind !== drag.DROP_KINDS.ROOT_END) return;
        e.preventDefault();
        drag.commitDrop();
      }}
    >
      {items}
    </div>
  );
}

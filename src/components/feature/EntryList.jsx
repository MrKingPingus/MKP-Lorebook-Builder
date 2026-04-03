// Scrollable sortable list of EntryCard components with drag-and-drop reorder support (desktop only)
import { useRef, useEffect } from 'react';
import { EntryCard }   from './EntryCard.jsx';
import { useEntries }  from '../../hooks/use-entries.js';
import { useUi }       from '../../hooks/use-ui.js';
import { useMobile }   from '../../hooks/use-mobile.js';
import { ENTRY_TYPES } from '../../constants/entry-types.js';

export function EntryList({ entries, groupByType }) {
  const { updateEntry, removeEntry, reorderEntries } = useEntries();
  const isMobile  = useMobile();
  const sortMode  = useUi((s) => s.sortMode);
  const dragIdx          = useRef(null);
  const isDragFromHandle = useRef(false);

  // Reset the drag-handle flag on every mouseup so stale state can't bleed into the next gesture
  useEffect(() => {
    function resetFlag() { isDragFromHandle.current = false; }
    window.addEventListener('mouseup', resetFlag);
    return () => window.removeEventListener('mouseup', resetFlag);
  }, []);

  if (!entries || entries.length === 0) {
    return (
      <div className="entry-list-empty">
        No entries yet. Press Alt+N or click + to add one.
      </div>
    );
  }

  function onDragStart(idx) {
    dragIdx.current = idx;
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      reorderEntries(dragIdx.current, idx);
      dragIdx.current = idx;
    }
  }

  // Build items with optional type-group headers
  const items = [];
  let lastType = null;
  entries.forEach((entry, idx) => {
    if (groupByType && entry.type !== lastType) {
      const typeDef = ENTRY_TYPES.find((t) => t.id === entry.type);
      items.push(
        <div
          key={`group-${entry.type}`}
          className="type-group-header"
          style={{ '--type-color': typeDef?.color ?? '#9ba1ad' }}
        >
          {typeDef?.label ?? entry.type}
        </div>
      );
      lastType = entry.type;
    }

    // Desktop + default sort: drag enabled. Mobile or non-default sort: no drag.
    const dragProps = (isMobile || sortMode !== 'default') ? {} : {
      draggable: true,
      onDragStart: (e) => {
        if (!isDragFromHandle.current) { e.preventDefault(); return; }
        onDragStart(idx);
      },
      onDragOver: (e) => onDragOver(e, idx),
      onDragEnd:  () => { dragIdx.current = null; isDragFromHandle.current = false; },
    };

    items.push(
      <div
        key={entry.id}
        {...dragProps}
        className="entry-list-item"
      >
        <EntryCard
          entry={entry}
          index={idx + 1}
          onUpdate={updateEntry}
          onRemove={removeEntry}
          onDragHandleMouseDown={(isMobile || sortMode !== 'default') ? undefined : () => { isDragFromHandle.current = true; }}
        />
      </div>
    );
  });

  return (
    <div className="entry-list">
      {items}
    </div>
  );
}

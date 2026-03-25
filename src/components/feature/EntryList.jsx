// Scrollable sortable list of EntryCard components with drag-and-drop reorder support
import { useRef } from 'react';
import { EntryCard }   from './EntryCard.jsx';
import { useEntries }  from '../../hooks/use-entries.js';
import { ENTRY_TYPES } from '../../constants/entry-types.js';

export function EntryList({ entries, groupByType }) {
  const { updateEntry, removeEntry, reorderEntries } = useEntries();
  const dragIdx = useRef(null);

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
    items.push(
      <div
        key={entry.id}
        draggable
        onDragStart={() => onDragStart(idx)}
        onDragOver={(e) => onDragOver(e, idx)}
        onDragEnd={() => { dragIdx.current = null; }}
        className="entry-list-item"
      >
        <EntryCard
          entry={entry}
          index={idx}
          onUpdate={updateEntry}
          onRemove={removeEntry}
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

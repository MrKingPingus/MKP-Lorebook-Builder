// Scrollable sortable list of EntryCard components with drag-and-drop reorder support
import { useRef } from 'react';
import { EntryCard } from './EntryCard.jsx';
import { useEntries } from '../../hooks/use-entries.js';

export function EntryList({ entries }) {
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

  return (
    <div className="entry-list">
      {entries.map((entry, idx) => (
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
      ))}
    </div>
  );
}

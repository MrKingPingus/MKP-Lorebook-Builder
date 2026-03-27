// Reorderable pill row for assembling multi-word compound trigger phrases with confirm and cancel
import { useRef } from 'react';

export function PhraseBuilder({ words, onRemove, onMove, onEdit, onCommit, onCancel }) {
  const dragIdx = useRef(null);

  function onDragStart(idx) {
    dragIdx.current = idx;
  }

  function onDragOver(e, idx) {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== idx) {
      onMove(dragIdx.current, idx);
      dragIdx.current = idx;
    }
  }

  function moveLeft(idx) {
    if (idx > 0) onMove(idx, idx - 1);
  }

  function moveRight(idx) {
    if (idx < words.length - 1) onMove(idx, idx + 1);
  }

  return (
    <div className="phrase-builder">
      <div className="phrase-pills">
        {words.map((word, idx) => (
          <span
            key={idx}
            className="phrase-pill"
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={() => { dragIdx.current = null; }}
          >
            <button className="pill-arrow" onClick={() => moveLeft(idx)}  disabled={idx === 0}>‹</button>
            <input
              className="pill-input"
              value={word}
              onChange={(e) => onEdit(idx, e.target.value)}
              size={Math.max(1, word.length)}
            />
            <button className="pill-arrow" onClick={() => moveRight(idx)} disabled={idx === words.length - 1}>›</button>
            <button className="pill-delete" onClick={() => onRemove(word)}>×</button>
          </span>
        ))}
      </div>
      <div className="phrase-actions">
        <button className="phrase-commit" onClick={onCommit} disabled={words.length === 0}>
          Add phrase
        </button>
        <button className="phrase-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

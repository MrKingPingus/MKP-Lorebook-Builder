// Phrase builder: ordered token sequence (suggestion chips + typed text) with drag reorder and insertion slots
import { useRef, useState } from 'react';

export function PhraseBuilder({ tokens, onInsert, onRemove, onMove, onCommit, onCancel }) {
  const dragIdx = useRef(null);
  const [activeSlot, setActiveSlot] = useState(null);

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

  function handleInsert(slotIdx, text) {
    if (text.trim()) onInsert(slotIdx, text);
    setActiveSlot(null);
  }

  // Build interleaved array: slot(0), token(0), slot(1), token(1), ..., slot(n)
  const items = [];
  for (let i = 0; i <= tokens.length; i++) {
    const slotIdx = i;
    items.push(
      <InsertionSlot
        key={`slot-${i}`}
        active={activeSlot === slotIdx}
        onOpen={() => setActiveSlot(slotIdx)}
        onInsert={(text) => handleInsert(slotIdx, text)}
        onCancel={() => setActiveSlot(null)}
      />
    );
    if (i < tokens.length) {
      const token = tokens[i];
      items.push(
        <span
          key={`token-${i}`}
          className={`phrase-token phrase-token--${token.type}`}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragOver={(e) => onDragOver(e, i)}
          onDragEnd={() => { dragIdx.current = null; }}
        >
          <span className="phrase-token-text">{token.text}</span>
          <button className="pill-delete" onClick={() => onRemove(i)}>×</button>
        </span>
      );
    }
  }

  return (
    <div className="phrase-builder">
      <div className="phrase-pills">
        {items}
      </div>
      <div className="phrase-actions">
        <button className="phrase-commit" onClick={onCommit} disabled={tokens.length === 0}>
          Add phrase
        </button>
        <button className="phrase-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function InsertionSlot({ active, onOpen, onInsert, onCancel }) {
  function onKeyDown(e) {
    if (e.key === 'Enter') {
      const val = e.target.value;
      e.target.value = '';
      onInsert(val);
    }
    if (e.key === 'Escape') {
      e.target.value = '';
      onCancel();
    }
  }
  function onBlur(e) {
    // value is already '' if Enter/Escape was used; harmless no-op in that case
    onInsert(e.target.value);
  }
  if (active) {
    return (
      <input
        className="phrase-slot-input"
        autoFocus
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder="type text…"
      />
    );
  }
  return (
    <button className="phrase-slot-btn" onClick={onOpen} title="Insert text here">+</button>
  );
}

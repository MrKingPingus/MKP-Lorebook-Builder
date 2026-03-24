// Reorderable pill row for assembling multi-word compound trigger phrases with confirm and cancel
export function PhraseBuilder({ words, onRemove, onMove, onCommit, onCancel }) {
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
          <span key={idx} className="phrase-pill">
            <button className="pill-arrow" onClick={() => moveLeft(idx)}  disabled={idx === 0}>‹</button>
            <span className="pill-word">{word}</span>
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

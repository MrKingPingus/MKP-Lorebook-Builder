// Phrase builder: ordered word pills with two-click swap reordering and commit/cancel actions
export function PhraseBuilder({ phraseQueue, selectedPhraseIdx, onSelect, onRemove, onCommit, onCancel }) {
  return (
    <div className="phrase-builder">
      <div className="phrase-pills">
        {phraseQueue.length === 0 && (
          <span className="phrase-pills-empty">Click suggestion chips to add words…</span>
        )}
        {phraseQueue.map((word, idx) => (
          <span
            key={idx}
            className={`phrase-pill${selectedPhraseIdx === idx ? ' phrase-pill--selected' : ''}`}
            onClick={() => onSelect(idx)}
            title={
              selectedPhraseIdx === -1
                ? 'Click to select for swap'
                : selectedPhraseIdx === idx
                  ? 'Click again to deselect'
                  : 'Click to swap with selected'
            }
          >
            {word}
            <button
              className="pill-delete"
              onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
              title="Remove"
            >×</button>
          </span>
        ))}
      </div>
      <div className="phrase-actions">
        <button
          className="phrase-commit"
          disabled={phraseQueue.length === 0}
          onClick={onCommit}
        >✓ Add phrase</button>
        <button className="phrase-cancel" onClick={onCancel}>✕ Cancel</button>
      </div>
    </div>
  );
}

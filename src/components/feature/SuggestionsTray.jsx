// Collapsible tray: ▶/▼ TRIGGER WORD SUGGESTIONS | ↺ reroll | + Phrase — all on one header row
import { useSuggestions }  from '../../hooks/use-suggestions.js';
import { usePhraseBuilder } from '../../hooks/use-phrase-builder.js';
import { PhraseBuilder }   from './PhraseBuilder.jsx';

export function SuggestionsTray({ entry, onAddTrigger }) {
  const { suggestions, open, toggle, addSuggestion, reroll } = useSuggestions(entry, onAddTrigger);
  const phrase = usePhraseBuilder(onAddTrigger);

  return (
    <div className="suggestions-tray">
      {/* Header row */}
      <div className="suggestions-header">
        <button className="suggestions-reroll" onClick={reroll} title="Regenerate suggestions">↺</button>
        <button className="suggestions-toggle" onClick={toggle}>
          {open ? '▼' : '▶'} TRIGGER WORD SUGGESTIONS
        </button>
        <button
          className={`suggestions-phrase-btn${phrase.phraseMode ? ' suggestions-phrase-btn--active' : ''}`}
          onClick={phrase.phraseMode ? phrase.close : phrase.open}
          title="Phrase builder"
        >
          + Phrase
        </button>
      </div>

      {/* Phrase builder */}
      {phrase.phraseMode && (
        <PhraseBuilder
          phraseQueue={phrase.phraseQueue}
          selectedPhraseIdx={phrase.selectedPhraseIdx}
          onSelect={phrase.selectPill}
          onRemove={phrase.removeWord}
          onCommit={phrase.commit}
          onCancel={phrase.close}
        />
      )}

      {/* Suggestions chips */}
      {open && (
        <div className="suggestions-chips">
          {suggestions.length === 0 ? (
            <span className="suggestions-empty">No suggestions — try adding a name or description.</span>
          ) : (
            suggestions.map((s) => (
              <button
                key={s}
                className="suggestion-chip"
                disabled={phrase.phraseMode && phrase.phraseQueue.includes(s)}
                onClick={() => phrase.phraseMode ? phrase.addWord(s) : addSuggestion(s)}
                title={phrase.phraseMode ? `Add "${s}" to phrase` : `Add "${s}" as trigger`}
              >
                {s}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

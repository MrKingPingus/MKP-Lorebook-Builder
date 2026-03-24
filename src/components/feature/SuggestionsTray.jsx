// Collapsible tray showing up to 12 trigger keyword suggestions with reroll and one-click add
import { useSuggestions } from '../../hooks/use-suggestions.js';

export function SuggestionsTray({ entry, onAddTrigger }) {
  const { suggestions, open, toggle, addSuggestion, reroll } = useSuggestions(entry, onAddTrigger);

  return (
    <div className="suggestions-tray">
      <button className="suggestions-toggle" onClick={toggle}>
        {open ? '▲' : '▼'} Suggestions
      </button>
      {open && (
        <div className="suggestions-content">
          {suggestions.length === 0 ? (
            <span className="suggestions-empty">No suggestions</span>
          ) : (
            <div className="suggestions-chips">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => addSuggestion(s)}
                  title={`Add "${s}" as trigger`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <button className="suggestions-reroll" onClick={reroll} title="Regenerate suggestions">
            ↺ Reroll
          </button>
        </div>
      )}
    </div>
  );
}

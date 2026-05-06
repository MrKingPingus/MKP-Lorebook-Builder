// Collapsible tray: ▶/▼ TRIGGER WORD SUGGESTIONS | ↺ reroll | + Phrase — all on one header row
import { useState, useRef }          from 'react';
import { useSuggestions }            from '../../hooks/use-suggestions.js';
import { usePhraseBuilder }          from '../../hooks/use-phrase-builder.js';
import { useSettings }               from '../../hooks/use-settings.js';
import { useMobile }                 from '../../hooks/use-mobile.js';
import { ThesaurusPopover }          from './ThesaurusPopover.jsx';
import { PhraseBuilder }             from './PhraseBuilder.jsx';
import { THESAURUS_LONG_PRESS_MS }   from '../../constants/limits.js';

const HOVER_OPEN_MS  = 140;
const HOVER_CLOSE_MS = 160;

export function SuggestionsTray({ entry, onAddTrigger, onAddTriggers }) {
  const { suggestions, open, toggle, addSuggestion, reroll } = useSuggestions(entry, onAddTrigger);
  const phrase   = usePhraseBuilder(onAddTrigger);
  const { thesaurusEnabled } = useSettings();
  const isMobile = useMobile();

  const [activePopover, setActivePopover] = useState(null); // { word, el } | null
  const openTimerRef         = useRef(null);
  const closeTimerRef        = useRef(null);
  const longPressTimerRef    = useRef(null);
  const suppressNextClickRef = useRef(false);

  // Thesaurus is suppressed inside the phrase builder — chips there feed the
  // phrase queue rather than the trigger list, so a synonym popover would be
  // confusing.
  const thesaurusOn = thesaurusEnabled && !phrase.phraseMode;

  function closePopover() { setActivePopover(null); }

  // Desktop hover
  function onChipMouseEnter(word, el) {
    if (isMobile || !thesaurusOn) return;
    clearTimeout(closeTimerRef.current);
    clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => setActivePopover({ word, el }), HOVER_OPEN_MS);
  }
  function onChipMouseLeave() {
    if (isMobile || !thesaurusOn) return;
    clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(closePopover, HOVER_CLOSE_MS);
  }
  function onPopoverMouseEnter() {
    clearTimeout(closeTimerRef.current);
  }
  function onPopoverMouseLeave() {
    if (isMobile) return;
    closeTimerRef.current = setTimeout(closePopover, HOVER_CLOSE_MS);
  }

  // Mobile long-press: opens the popover and suppresses the click that fires
  // on touch release (which would otherwise add the chip as a trigger).
  function onChipPointerDown(word, el) {
    if (!isMobile || !thesaurusOn) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      suppressNextClickRef.current = true;
      setActivePopover({ word, el });
      // Self-heal: some mobile browsers swallow the click after a long-press
      // (context menu wins). Auto-clear so a later legitimate click isn't lost.
      setTimeout(() => { suppressNextClickRef.current = false; }, 600);
    }, THESAURUS_LONG_PRESS_MS);
  }
  function onChipPointerUp() {
    if (!isMobile) return;
    clearTimeout(longPressTimerRef.current);
  }

  function onChipClick(word) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (phrase.phraseMode) phrase.addWord(word);
    else                   addSuggestion(word);
  }

  function onPopoverAdd(words) {
    if (onAddTriggers) onAddTriggers(words);
    else for (const w of words) onAddTrigger(w);
  }

  return (
    <div className="suggestions-tray">
      {/* Header row */}
      <div className="suggestions-header">
        <button className="suggestions-toggle" onClick={toggle}>
          {open ? '▼' : '▶'} TRIGGER WORD SUGGESTIONS
        </button>
        <button className="suggestions-reroll" onClick={reroll} title="Regenerate suggestions">↺</button>
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
                onClick={() => onChipClick(s)}
                onMouseEnter={(e) => onChipMouseEnter(s, e.currentTarget)}
                onMouseLeave={onChipMouseLeave}
                onPointerDown={(e) => onChipPointerDown(s, e.currentTarget)}
                onPointerUp={onChipPointerUp}
                onPointerCancel={onChipPointerUp}
                onContextMenu={(e) => { if (isMobile && thesaurusOn) e.preventDefault(); }}
                title={phrase.phraseMode ? `Add "${s}" to phrase` : `Add "${s}" as trigger`}
              >
                {s}
              </button>
            ))
          )}
        </div>
      )}

      {activePopover && thesaurusOn && (
        <ThesaurusPopover
          word={activePopover.word}
          anchorEl={activePopover.el}
          existingTriggers={entry.triggers ?? []}
          onAddTriggers={onPopoverAdd}
          onClose={closePopover}
          onMouseEnter={onPopoverMouseEnter}
          onMouseLeave={onPopoverMouseLeave}
        />
      )}
    </div>
  );
}

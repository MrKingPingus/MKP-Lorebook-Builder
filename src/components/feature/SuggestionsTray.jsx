// Collapsible tray: ▶/▼ TRIGGER WORD SUGGESTIONS | ↺ reroll | + Phrase — all on one header row
import { useState, useRef, useEffect } from 'react';
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
  // Where the pointer was when a chip was last accepted. Removing that chip
  // reflows the list, sliding a different chip under a cursor that never moved
  // and firing a mouseenter the user did not perform. A reflow-induced enter
  // arrives at these same coordinates; a real move does not. (#130)
  const clickPointRef        = useRef(null);

  // Thesaurus is suppressed inside the phrase builder — chips there feed the
  // phrase queue rather than the trigger list, so a synonym popover would be
  // confusing.
  const thesaurusOn = thesaurusEnabled && !phrase.phraseMode;

  function closePopover() { setActivePopover(null); }

  function clearHoverTimers() {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }

  // A chip that leaves the list takes its popover with it. Accepting a
  // suggestion removes the word (use-suggestions.addSuggestion), which unmounts
  // the chip — and an unmounted chip can never fire mouseleave, so the hover
  // close path is gone and the popover would hang anchored to a detached node.
  useEffect(() => {
    if (activePopover && !suggestions.includes(activePopover.word)) closePopover();
  }, [suggestions, activePopover]);

  // Timers must not outlive the tray: collapsing the card while one is pending
  // would otherwise open a popover on a component that no longer exists.
  useEffect(() => () => {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
    clearTimeout(longPressTimerRef.current);
  }, []);

  // Desktop hover
  function onChipMouseEnter(word, el, e) {
    if (isMobile || !thesaurusOn) return;
    const from = clickPointRef.current;
    if (from && Math.abs(e.clientX - from.x) <= 2 && Math.abs(e.clientY - from.y) <= 2) return;
    clickPointRef.current = null;
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

  function onChipClick(word, e) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    // Clicking is decisive: cancel the pending hover-open so the popover cannot
    // appear on its own a moment later, and drop any popover already showing —
    // synonyms for a word you just accepted are noise.
    clearHoverTimers();
    closePopover();
    clickPointRef.current = { x: e.clientX, y: e.clientY };
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
                onClick={(e) => onChipClick(s, e)}
                onMouseEnter={(e) => onChipMouseEnter(s, e.currentTarget, e)}
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

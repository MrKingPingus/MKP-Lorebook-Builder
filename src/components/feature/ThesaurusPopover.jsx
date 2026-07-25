// Chip-anchored synonym popover. Multi-select mini-chips, "Add" commits
// all selected synonyms in one shot. Definitions cycle via ◀ ▶ arrows so
// users can pick the sense relevant to their entry (e.g., "good" as
// virtuous vs. "good" as high-quality).
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useThesaurus } from '../../hooks/use-thesaurus.js';

const POPOVER_MAX_WIDTH = 280;

export function ThesaurusPopover({
  word,
  anchorEl,
  existingTriggers,
  onAddTriggers,
  onClose,
  onMouseEnter,
  onMouseLeave,
  // When set, the popover renders a Replace button alongside Add Similar.
  // Used by attached trigger chips so the user can swap a trigger for one of
  // its synonyms instead of (or in addition to) adding more.
  sourceWord,
  onReplace,
}) {
  const { senses, senseIndex, currentSense, resolved, loading, error, nextSense, prevSense, retry } = useThesaurus(word);
  const [selected,   setSelected]   = useState(() => new Set());
  const [pos,        setPos]        = useState(null);
  const [interacted, setInteracted] = useState(false);
  const popoverRef = useRef(null);

  // Position once per anchor change. Mirror Chip.jsx's pattern: pin above
  // the anchor and clamp left within the viewport.
  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPos({
      left:   Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_MAX_WIDTH - 8)),
      bottom: window.innerHeight - rect.top + 6,
    });
  }, [anchorEl, word]);

  // Reset selection and interaction state whenever the source word changes.
  // Selection persists across sense changes within the same word — users can
  // pick from sense 1, cycle to sense 3, pick more, then Add everything in
  // one commit.
  useEffect(() => {
    setSelected(new Set());
    setInteracted(false);
  }, [word]);

  // Outside-click + Escape dismissal
  useEffect(() => {
    function onPointer(e) {
      if (popoverRef.current?.contains(e.target)) return;
      if (anchorEl?.contains(e.target))           return;
      onClose();
    }
    // Consume Escape before the window dispatcher so it closes this popover only
    // (works even while a text field is focused, unlike the global handler).
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown',     onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown',     onKey);
    };
  }, [anchorEl, onClose]);

  function toggle(w) {
    setInteracted(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w); else next.add(w);
      return next;
    });
  }
  function pinAndPrev() { setInteracted(true); prevSense(); }
  function pinAndNext() { setInteracted(true); nextSense(); }

  function commit() {
    if (selected.size === 0) return;
    onAddTriggers([...selected]);
    onClose();
  }

  function commitReplace() {
    if (selected.size !== 1 || !onReplace) return;
    onReplace([...selected][0]);
    onClose();
  }

  const replaceMode = Boolean(sourceWord && onReplace);

  if (!pos) return null;

  const existingLower = new Set((existingTriggers || []).map((t) => t.toLowerCase()));
  const hasMultipleSenses = senses.length > 1;
  const showEmpty = !loading && !error && senses.length === 0;
  // Show "(via 'life')" only when an inflection fallback resolved the word to a
  // different base form than what the user hovered.
  const viaLemma = resolved && resolved.toLowerCase() !== (word || '').trim().toLowerCase()
    ? resolved
    : null;

  return createPortal(
    <div
      ref={popoverRef}
      className="thesaurus-popover"
      style={{ position: 'fixed', left: pos.left, bottom: pos.bottom, maxWidth: POPOVER_MAX_WIDTH }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={interacted ? undefined : onMouseLeave}
    >
      <div className="thesaurus-popover-header">
        <div
          className="thesaurus-popover-title"
          title={viaLemma ? `Synonyms for "${word}" (via "${viaLemma}")` : `Synonyms for "${word}"`}
        >
          Synonyms for "{word}"
          {viaLemma && <span className="thesaurus-popover-via"> (via "{viaLemma}")</span>}
        </div>
        <div className="thesaurus-popover-actions">
          {replaceMode && (
            <button
              className="thesaurus-replace-btn"
              disabled={selected.size !== 1}
              onClick={commitReplace}
              title={
                selected.size === 0 ? 'Select one synonym to replace the trigger'
                : selected.size > 1 ? 'Replace works with a single synonym'
                : `Replace "${sourceWord}" with the selected synonym`
              }
            >
              Replace
            </button>
          )}
          <button
            className="thesaurus-add-btn"
            disabled={selected.size === 0}
            onClick={commit}
            title={replaceMode ? 'Add selected synonyms as additional triggers' : 'Add selected synonyms as triggers'}
          >
            {replaceMode ? 'Add Similar' : 'Add'}{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>

      {currentSense && (
        <div className="thesaurus-sense-bar">
          <button
            className="thesaurus-sense-arrow"
            onClick={pinAndPrev}
            disabled={!hasMultipleSenses}
            title="Previous definition"
          >
            ◀
          </button>
          <div className="thesaurus-sense-text">
            {currentSense.partOfSpeech && (
              <span className="thesaurus-sense-pos">{currentSense.partOfSpeech}</span>
            )}
            <span className="thesaurus-sense-def" title={currentSense.definition}>
              {currentSense.definition}
            </span>
          </div>
          <div className="thesaurus-sense-counter">
            {hasMultipleSenses ? `${senseIndex + 1}/${senses.length}` : ''}
          </div>
          <button
            className="thesaurus-sense-arrow"
            onClick={pinAndNext}
            disabled={!hasMultipleSenses}
            title="Next definition"
          >
            ▶
          </button>
        </div>
      )}

      <div className="thesaurus-popover-body">
        {loading && <div className="thesaurus-state">Loading…</div>}

        {!loading && error && (
          <div className="thesaurus-state thesaurus-state--error">
            <span>Couldn't reach thesaurus.</span>
            <button className="thesaurus-retry" onClick={retry} title="Retry">↻</button>
          </div>
        )}

        {showEmpty && (
          <div className="thesaurus-state thesaurus-state--empty">No synonyms found.</div>
        )}

        {currentSense && (
          <div className="thesaurus-chips">
            {currentSense.synonyms.map((w) => {
              const already    = existingLower.has(w.toLowerCase());
              const isSelected = selected.has(w);
              return (
                <button
                  key={w}
                  className={`thesaurus-chip${isSelected ? ' thesaurus-chip--selected' : ''}`}
                  disabled={already}
                  onClick={() => toggle(w)}
                  title={already ? `"${w}" is already a trigger` : `Toggle "${w}"`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

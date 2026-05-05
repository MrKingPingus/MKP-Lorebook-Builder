// Chip-anchored synonym popover. Multi-select mini-chips, "Add" commits all
// selected synonyms as triggers in one shot, "More" pages 5 at a time.
import { useState, useEffect, useRef } from 'react';
import { createPortal }    from 'react-dom';
import { useThesaurus }    from '../../hooks/use-thesaurus.js';

const POPOVER_MAX_WIDTH = 260;

export function ThesaurusPopover({
  word,
  anchorEl,
  existingTriggers,
  onAddTriggers,
  onClose,
  onMouseEnter,
  onMouseLeave,
}) {
  const { words, loading, error, retry, total } = useThesaurus(word);
  const [selected, setSelected] = useState(() => new Set());
  const [pos,      setPos]      = useState(null);
  const popoverRef = useRef(null);

  // Position once per anchor change. Mirror Chip.jsx's pattern: pin the
  // popover above the anchor and clamp left within the viewport.
  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPos({
      left:   Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_MAX_WIDTH - 8)),
      bottom: window.innerHeight - rect.top + 6,
    });
  }, [anchorEl, word]);

  // Reset selection whenever the source word changes
  useEffect(() => { setSelected(new Set()); }, [word]);

  // Outside-click + Escape dismissal
  useEffect(() => {
    function onPointer(e) {
      if (popoverRef.current?.contains(e.target)) return;
      if (anchorEl?.contains(e.target))           return;
      onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown',     onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown',     onKey);
    };
  }, [anchorEl, onClose]);

  function toggle(w) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w); else next.add(w);
      return next;
    });
  }

  function commit() {
    if (selected.size === 0) return;
    onAddTriggers([...selected]);
    onClose();
  }

  if (!pos) return null;

  const existingLower = new Set((existingTriggers || []).map((t) => t.toLowerCase()));
  const showEmpty = !loading && !error && total === 0;

  return createPortal(
    <div
      ref={popoverRef}
      className="thesaurus-popover"
      style={{ position: 'fixed', left: pos.left, bottom: pos.bottom, maxWidth: POPOVER_MAX_WIDTH }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="thesaurus-popover-header">
        <div className="thesaurus-popover-title" title={`Synonyms for "${word}"`}>
          Synonyms for "{word}"
        </div>
        <button
          className="thesaurus-add-btn"
          disabled={selected.size === 0}
          onClick={commit}
          title="Add selected synonyms as triggers"
        >
          Add{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
      </div>

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

        {!loading && !error && words.length > 0 && (
          <div className="thesaurus-chips">
            {words.map((w) => {
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

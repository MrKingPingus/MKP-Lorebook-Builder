// A "press the keys" capture control for one keybinding row. Clicking arms it;
// the next non-modifier keydown becomes the chord. Reserved chords are refused
// with an inline message; Escape while armed cancels. Uses the capture phase so
// the keys being recorded never trigger the app's own shortcuts.
import { useState, useEffect } from 'react';
import { useKeybindings } from '../../hooks/use-keybindings.js';

export function KeyChordCapture({ row, onAssign }) {
  const { chordFromEvent, isReservedChord, formatChord } = useKeybindings();
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!capturing) return undefined;
    function onKey(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setCapturing(false); setError(null); return; }
      const chord = chordFromEvent(e);
      if (!chord) return; // lone modifier — keep listening
      if (isReservedChord(chord)) {
        setError(`${formatChord(chord)} is reserved`);
        return;
      }
      onAssign(chord);
      setCapturing(false);
      setError(null);
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, chordFromEvent, isReservedChord, formatChord, onAssign]);

  return (
    <span className="kbd-capture">
      <button
        type="button"
        className={`kbd-capture-btn${capturing ? ' kbd-capture-btn--active' : ''}`}
        onClick={() => { setError(null); setCapturing((c) => !c); }}
        aria-label={`Change shortcut for ${row.label}`}
      >
        {capturing
          ? 'Press keys…'
          : row.displayChords.map((c, i) => <kbd key={i} className="kbd-chip">{c}</kbd>)}
      </button>
      {error && <span className="kbd-capture-error">{error}</span>}
    </span>
  );
}

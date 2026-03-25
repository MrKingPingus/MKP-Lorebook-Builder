// Single text field trigger mode — comma or semicolon delimited; parses on blur to preserve spaces mid-word
import { useState, useEffect, useRef } from 'react';

function joinTriggers(triggers, delimiter) {
  return triggers.join(`${delimiter} `);
}

function parseTriggers(text, delimiter) {
  return text
    .split(delimiter === ',' ? /,/ : /;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function TriggerCompact({ triggers, onUpdate }) {
  const [delimiter, setDelimiter] = useState(',');
  // Local draft so spaces mid-word are not eaten by controlled-input trimming
  const [draft, setDraft] = useState(() => joinTriggers(triggers, ','));
  // Track last-committed trigger array to avoid overwriting user's draft on unrelated re-renders
  const lastCommitted = useRef(triggers);

  // Sync draft when triggers change from outside (e.g. undo/redo, suggestion add)
  useEffect(() => {
    if (triggers !== lastCommitted.current) {
      lastCommitted.current = triggers;
      setDraft(joinTriggers(triggers, delimiter));
    }
  }, [triggers, delimiter]);

  function onBlur() {
    const parts = parseTriggers(draft, delimiter);
    lastCommitted.current = parts;
    onUpdate(parts);
    // Reformat after commit so the display is canonical
    setDraft(joinTriggers(parts, delimiter));
  }

  function toggleDelimiter() {
    const next = delimiter === ',' ? ';' : ',';
    setDelimiter(next);
    setDraft(joinTriggers(parseTriggers(draft, delimiter), next));
  }

  return (
    <div className="trigger-compact">
      <textarea
        className="trigger-compact-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={onBlur}
        placeholder="Triggers (comma-separated, spaces allowed within each trigger)…"
        rows={2}
      />
      <button
        className="delimiter-btn"
        onClick={toggleDelimiter}
        title="Switch delimiter"
      >
        {delimiter === ',' ? 'CSV' : 'SSV'}
      </button>
    </div>
  );
}

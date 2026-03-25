// Chip-per-trigger input with inline label editing, × delete, bulk paste, counter badge, and dupe flash
import { useRef, useState } from 'react';
import { Chip } from '../ui/Chip.jsx';
import { MAX_TRIGGERS } from '../../constants/limits.js';

const TRIGGER_WARN_YELLOW = 20;

export function TriggerChips({ triggers, type, onUpdate, delimiter = ',' }) {
  const inputRef  = useRef(null);
  const [flashDupe, setFlashDupe] = useState(false);
  const dupeTimer = useRef(null);

  function flashDupeError() {
    clearTimeout(dupeTimer.current);
    setFlashDupe(true);
    dupeTimer.current = setTimeout(() => setFlashDupe(false), 1500);
  }

  function addTrigger(raw) {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const next  = [...triggers];
    let dupFound = false;
    for (const p of parts) {
      if (next.some((t) => t.toLowerCase() === p.toLowerCase())) {
        dupFound = true;
      } else if (next.length < MAX_TRIGGERS) {
        next.push(p);
      }
    }
    if (dupFound) flashDupeError();
    onUpdate(next);
  }

  const triggerColor =
    triggers.length >= MAX_TRIGGERS ? 'var(--red)'
    : triggers.length >= TRIGGER_WARN_YELLOW ? 'var(--yellow)'
    : 'var(--green)';

  function onKeyDown(e) {
    if ((e.key === 'Enter' || e.key === delimiter) && e.currentTarget.value.trim()) {
      e.preventDefault();
      addTrigger(e.currentTarget.value);
      e.currentTarget.value = '';
    }
    if (e.key === 'Backspace' && !e.currentTarget.value && triggers.length > 0) {
      onUpdate(triggers.slice(0, -1));
    }
  }

  function onPaste(e) {
    const text = e.clipboardData.getData('text');
    if (text.includes(',') || text.includes(';')) {
      e.preventDefault();
      addTrigger(text);
      e.currentTarget.value = '';
    }
  }

  function deleteTrigger(idx) {
    onUpdate(triggers.filter((_, i) => i !== idx));
  }

  function renameTrigger(idx, newLabel) {
    onUpdate(triggers.map((t, i) => (i === idx ? newLabel : t)));
  }

  return (
    <div className="trigger-chips-wrapper">
      <div className="trigger-chips" onClick={() => inputRef.current?.focus()}>
        {triggers.map((t, i) => (
          <Chip
            key={i}
            label={t}
            onDelete={() => deleteTrigger(i)}
            onRename={(v) => renameTrigger(i, v)}
          />
        ))}
        {triggers.length < MAX_TRIGGERS && (
          <input
            ref={inputRef}
            className="trigger-input"
            placeholder={triggers.length === 0 ? 'Add trigger...' : ''}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={(e) => {
              if (e.target.value.trim()) { addTrigger(e.target.value); e.target.value = ''; }
            }}
          />
        )}
      </div>
      <div className="trigger-chips-footer">
        {flashDupe && <span className="trigger-dupe-error">Already exists</span>}
        <span className="trigger-counter" style={{ color: triggerColor }}>
          {triggers.length}/{MAX_TRIGGERS}
        </span>
      </div>
    </div>
  );
}

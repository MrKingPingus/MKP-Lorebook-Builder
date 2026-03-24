// Chip-per-trigger input with inline label editing, × delete, and bulk paste
import { useRef } from 'react';
import { Chip } from '../ui/Chip.jsx';
import { MAX_TRIGGERS } from '../../constants/limits.js';

export function TriggerChips({ triggers, type, onUpdate, delimiter = ',' }) {
  const inputRef = useRef(null);

  const sep = delimiter === ';' ? /;/ : /,/;

  function addTrigger(raw) {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const next  = [...triggers];
    for (const p of parts) {
      if (!next.includes(p) && next.length < MAX_TRIGGERS) next.push(p);
    }
    onUpdate(next);
  }

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
  );
}

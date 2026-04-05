// Chip-per-trigger input with inline label editing, × delete, bulk paste, counter badge, and dupe flash
import { useRef, useState } from 'react';
import { Chip } from '../ui/Chip.jsx';
import { useSettings } from '../../hooks/use-settings.js';
import { MAX_TRIGGERS, TRIGGER_WARN_YELLOW, DUPE_FLASH_MS } from '../../constants/limits.js';

// Escape special regex characters in a delimiter string
function escapeDelim(d) {
  return d.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function TriggerChips({ triggers, onUpdate, delimiter = ',', searchQuery = '', conflictMap = null, allowedOverlaps = [], onAllowOverlap, onRevokeOverlap }) {
  const inputRef  = useRef(null);
  const [flashDupe, setFlashDupe]       = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const dupeTimer = useRef(null);
  const { tieredCounterEnabled } = useSettings();

  const tieredBorderStyle = (() => {
    if (!isInputFocused || !tieredCounterEnabled) return {};
    if (triggers.length >= MAX_TRIGGERS)      return { borderColor: 'var(--red)' };
    if (triggers.length >= TRIGGER_WARN_YELLOW) return { borderColor: 'var(--yellow)' };
    return {};
  })();

  function flashDupeError() {
    clearTimeout(dupeTimer.current);
    setFlashDupe(true);
    dupeTimer.current = setTimeout(() => setFlashDupe(false), DUPE_FLASH_MS);
  }

  function addTrigger(raw) {
    // Always split on comma and semicolon; also split on the active delimiter
    const delimPattern = new RegExp(`[,;${escapeDelim(delimiter)}]`);
    const parts = raw.split(delimPattern).map((s) => s.trim()).filter(Boolean);
    const next  = [...triggers];
    let dupFound = false;
    for (const p of parts) {
      if (next.some((t) => t.toLowerCase() === p.toLowerCase())) {
        dupFound = true;
      } else {
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
    if (text.includes(',') || text.includes(';') || text.includes(delimiter)) {
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
      <div className="trigger-chips" onClick={() => inputRef.current?.focus()} style={tieredBorderStyle}>
        {triggers.map((t, i) => {
          const conflictEntries = conflictMap?.get(t.toLowerCase()) ?? [];
          const isConflict      = conflictEntries.length > 0;
          const isAcknowledged  = allowedOverlaps.includes(t.toLowerCase());
          const ringColor = isConflict
            ? (isAcknowledged ? 'var(--blue)' : 'var(--yellow)')
            : null;

          return (
            <Chip
              key={i}
              label={t}
              onDelete={() => deleteTrigger(i)}
              onRename={(v) => renameTrigger(i, v)}
              highlight={searchQuery || undefined}
              ringColor={ringColor}
              conflictEntries={isConflict ? conflictEntries : null}
              acknowledged={isAcknowledged}
              onAllow={isConflict && !isAcknowledged ? () => onAllowOverlap?.(t.toLowerCase()) : null}
              onRevoke={isConflict && isAcknowledged  ? () => onRevokeOverlap?.(t.toLowerCase()) : null}
            />
          );
        })}
        <input
          ref={inputRef}
          className="trigger-input"
          placeholder={triggers.length === 0 ? 'Add trigger...' : ''}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={() => setIsInputFocused(true)}
          onBlur={(e) => {
            setIsInputFocused(false);
            if (e.target.value.trim()) { addTrigger(e.target.value); e.target.value = ''; }
          }}
        />
      </div>
      <div className="trigger-chips-footer">
        {flashDupe && <span className="trigger-dupe-error">Already exists</span>}
        <span className="trigger-counter" style={{ color: triggerColor }}>
          {triggers.length}/{MAX_TRIGGERS}
        </span>
        {triggers.length > MAX_TRIGGERS && (
          <span className="trigger-overlimit-warn">
            Entries with over 25 triggers might not function correctly
          </span>
        )}
      </div>
    </div>
  );
}

// Chip-per-trigger input with inline label editing, × delete, bulk paste, counter badge, and dupe flash
import { useRef, useState } from 'react';
import { Chip } from '../ui/Chip.jsx';
import { useSettings } from '../../hooks/use-settings.js';
import { MAX_TRIGGERS, TRIGGER_WARN_YELLOW, DUPE_FLASH_MS } from '../../constants/limits.js';
import { warningColor, triggerStops, isGradient } from '../../services/warning-color.js';

// Escape special regex characters in a delimiter string
function escapeDelim(d) {
  return d.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function TriggerChips({ entryId = null, triggers, onUpdate, delimiter = ',', searchQuery = '', conflictMap = null, allowedOverlaps = [], onAllowOverlap, onRevokeOverlap, ignoreLimitWarning = false, onToggleLimitWarning }) {
  const inputRef  = useRef(null);
  const [flashDupe, setFlashDupe] = useState(false);
  const dupeTimer = useRef(null);
  const { tieredCounterEnabled, warningScale } = useSettings();

  const stops      = triggerStops(warningScale);
  const gradient   = isGradient(warningScale);
  const overYellow = triggers.length >= TRIGGER_WARN_YELLOW;

  // Blue border when override active; otherwise the warning scale, with no
  // border at all below the first threshold.
  const tieredBorderStyle = (() => {
    if (ignoreLimitWarning && overYellow) return { borderColor: 'var(--blue)' };
    if (!tieredCounterEnabled || !overYellow) return {};
    return { borderColor: warningColor(triggers.length, stops, { gradient }) };
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
    return addTriggerList(parts);
  }

  // Append a list of pre-split trigger words; flashes the dup indicator if
  // any of them already exist. Returns nothing; callers don't need the result.
  function addTriggerList(parts) {
    const next  = [...triggers];
    let dupFound = false;
    for (const p of parts) {
      if (!p) continue;
      if (next.some((t) => t.toLowerCase() === p.toLowerCase())) {
        dupFound = true;
      } else {
        next.push(p);
      }
    }
    if (dupFound) flashDupeError();
    onUpdate(next);
  }

  const triggerColor = warningColor(triggers.length, stops, { gradient });

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
          // Exclude the parent entry's own id — a trigger can't conflict with itself.
          const rawConflicts    = conflictMap?.get(t.toLowerCase()) ?? [];
          const conflictEntries = entryId ? rawConflicts.filter((c) => c.id !== entryId) : rawConflicts;
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
              onReplace={(v) => renameTrigger(i, v)}
              onAddTriggers={addTriggerList}
              existingTriggers={triggers}
            />
          );
        })}
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
      </div>
      <div className="trigger-chips-footer">
        <div className="trigger-chips-footer-left">
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
        {overYellow && onToggleLimitWarning && (
          <button
            className={`override-pill override-pill--${ignoreLimitWarning ? 'active' : (triggers.length >= MAX_TRIGGERS ? 'red' : 'yellow')}`}
            onClick={onToggleLimitWarning}
            title={ignoreLimitWarning ? 'Limit override on — click to re-enable warnings' : 'Ignore the trigger limit warning for this entry'}
          >
            {ignoreLimitWarning ? 'Limit Ignored' : 'Ignore Limit'}
          </button>
        )}
      </div>
    </div>
  );
}

// Resolves the keybinding registry against the user's overrides and exposes the
// single source of truth for chords: the dispatcher's binding list, the display
// rows for Settings/overlay, and the assign/reset/validate helpers. Components
// use this hook rather than touching keychord.js or the store directly.
import { useMemo, useCallback } from 'react';
import { useSettings } from './use-settings.js';
import {
  KEYBINDINGS,
  KEYBINDING_MAP,
  KEYBINDING_CATEGORIES,
} from '../constants/keybindings.js';
import {
  formatChord,
  chordFromEvent,
  isReservedChord,
} from '../services/keychord.js';

// Effective chords for an action: the user override if set, else the registry
// default plus any altChords (which are dropped once the user customises).
function effectiveChords(def, override) {
  if (override) return [override];
  return [def.defaultChord, ...(def.altChords || [])];
}

export function useKeybindings() {
  const { keybindings, setKeybindings } = useSettings();
  const overrides = keybindings || {};

  // Resolved rows for display (Settings table, help overlay).
  const rows = useMemo(
    () =>
      KEYBINDINGS.map((def) => {
        const override = overrides[def.id];
        const chords = effectiveChords(def, override);
        return {
          ...def,
          override: override || null,
          isCustom: Boolean(override),
          chords,
          primaryChord: chords[0],
          displayChords: chords.map(formatChord),
          display: chords.map(formatChord).join(' / '),
        };
      }),
    [overrides],
  );

  // Compact binding list for the dispatcher: only what it needs to match.
  const bindings = useMemo(
    () =>
      rows
        .filter((r) => !r.fixed) // Escape is handled by the dismiss stack, not dispatched
        .map((r) => ({
          id: r.id,
          chords: r.chords,
          allowInInput: Boolean(r.allowInInput),
          context: r.context || null,
        })),
    [rows],
  );

  const rowsByCategory = useMemo(
    () =>
      KEYBINDING_CATEGORIES.map((cat) => ({
        ...cat,
        rows: rows.filter((r) => r.category === cat.id),
      })).filter((c) => c.rows.length > 0),
    [rows],
  );

  // Which other action (if any) already uses this chord.
  const conflictFor = useCallback(
    (chord, excludeId) => {
      for (const r of rows) {
        if (r.id === excludeId) continue;
        if (r.chords.includes(chord)) return r;
      }
      return null;
    },
    [rows],
  );

  const displayChord = useCallback((id) => {
    const r = KEYBINDING_MAP[id];
    if (!r) return '';
    const chord = overrides[id] || r.defaultChord;
    return formatChord(chord);
  }, [overrides]);

  const assign = useCallback(
    (id, chord) => {
      setKeybindings({ ...overrides, [id]: chord });
    },
    [overrides, setKeybindings],
  );

  const reset = useCallback(
    (id) => {
      if (!(id in overrides)) return;
      const next = { ...overrides };
      delete next[id];
      setKeybindings(next);
    },
    [overrides, setKeybindings],
  );

  const resetAll = useCallback(() => setKeybindings({}), [setKeybindings]);

  return {
    rows,
    rowsByCategory,
    bindings,
    conflictFor,
    displayChord,
    assign,
    reset,
    resetAll,
    formatChord,
    chordFromEvent,
    isReservedChord,
  };
}

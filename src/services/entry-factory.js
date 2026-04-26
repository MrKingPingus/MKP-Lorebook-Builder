// Factory functions: createEmptyEntry() and createEmptyLorebook() with canonical default shapes
import { DEFAULT_ENTRY, DEFAULT_LOREBOOK } from '../constants/defaults.js';

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyEntry(overrides = {}) {
  return { ...DEFAULT_ENTRY, id: uid(), lastModified: Date.now(), ...overrides };
}

// Clone an entry for cross-book copy: fresh id, fresh lastModified, no
// snapshots (those belong to the source). Triggers/ignoreLimitWarnings get
// shallow copies so the destination can mutate independently.
export function cloneEntry(entry) {
  return {
    ...entry,
    id:                  uid(),
    lastModified:        Date.now(),
    snapshots:           [],
    triggers:            [...(entry.triggers ?? [])],
    ignoreLimitWarnings: { ...(entry.ignoreLimitWarnings ?? {}) },
  };
}

export function createEmptyLorebook(overrides = {}) {
  return { ...DEFAULT_LOREBOOK, id: uid(), ...overrides };
}

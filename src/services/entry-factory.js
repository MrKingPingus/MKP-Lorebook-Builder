// Factory functions: createEmptyEntry() and createEmptyLorebook() with canonical default shapes
import { DEFAULT_ENTRY, DEFAULT_LOREBOOK } from '../constants/defaults.js';

// Shared id generator. Exported so folder-tree.js can mint folder ids from the
// same scheme rather than growing a second, subtly different one.
export function uid() {
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

// A lorebook is a placeholder when the App.jsx bootstrap marked it as such
// AND it still looks pristine. Once the user touches the name, adds an entry,
// or otherwise customizes the book, the marker stops applying — we don't
// need to mutate the flag because all the checks are content-derived.
export function isPlaceholderLorebook(lb) {
  if (!lb) return false;
  if (lb.placeholder !== true) return false;
  if ((lb.entries ?? []).length > 0) return false;
  if (lb.name && lb.name !== DEFAULT_LOREBOOK.name) return false;
  return true;
}

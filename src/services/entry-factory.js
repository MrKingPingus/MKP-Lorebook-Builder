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

// Clone an entry for cross-book copy: fresh id and no folder (a folderId names
// a folder in the SOURCE book, so carrying it across would dangle in the
// destination — and would silently re-file the entry if it ever got copied
// back). Triggers/ignoreLimitWarnings get shallow copies so the destination can
// mutate independently.
//
// Two of those defaults are negotiable, and the copy/move-to-lorebook path
// negotiates both:
//
// - `keepSnapshots` carries the entry's checkpoints across. The cross-PANEL
//   copy drops them because it is a reference gesture — you are pulling a
//   neighbouring book's entry over to work from, not relocating it. A transfer
//   between lorebooks is the opposite: the checkpoints are the thing you would
//   most regret leaving behind, so #127's paths pass this.
// - `keepModified` leaves `lastModified` alone. A move did not change the
//   entry, it relocated it, and "recently modified" is a sort option — refresh
//   it and every moved entry jumps to the top of its new book for no reason.
export function cloneEntry(entry, { keepSnapshots = false, keepModified = false } = {}) {
  return {
    ...entry,
    id:                  uid(),
    folderId:            null,
    triggers:            [...(entry.triggers ?? [])],
    ignoreLimitWarnings: { ...(entry.ignoreLimitWarnings ?? {}) },
    ...(keepModified  ? {} : { lastModified: Date.now() }),
    ...(keepSnapshots ? { snapshots: [...(entry.snapshots ?? [])] } : { snapshots: [] }),
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

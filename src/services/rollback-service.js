// Pure rollback helpers: snapshot creation, capped insertion, and session-touch tracking.
// No React imports — safe to call from hooks or other services.
import { ROLLBACK_MAX_CUSTOM } from '../constants/limits.js';

// Entries touched (first edit) in this page session — used by auto-snapshot logic.
// Module-level so it survives re-renders without a ref or store.
const sessionTouchedIds = new Set();

// Tracks whether "Don't ask again this session" was chosen for the navigate-away prompt.
let suppressPromptThisSession = false;

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------

/** Build a snapshot object from an entry's current content fields. */
export function buildSnapshot(entry) {
  return {
    name:        entry.name,
    type:        entry.type,
    description: entry.description,
    triggers:    [...entry.triggers],
    timestamp:   Date.now(),
    label:       '',  // user-editable; empty means display the formatted timestamp
  };
}

// ---------------------------------------------------------------------------
// Snapshot array management
// ---------------------------------------------------------------------------

/**
 * Return a new snapshots array with `snapshot` prepended and trimmed to `maxCount`.
 * Newest snapshot is always at index 0.
 */
export function addSnapshot(snapshots, snapshot, maxCount) {
  const capped = Math.min(Math.max(1, maxCount), ROLLBACK_MAX_CUSTOM);
  return [snapshot, ...snapshots].slice(0, capped);
}

// ---------------------------------------------------------------------------
// Session tracking
// ---------------------------------------------------------------------------

export function hasBeenTouchedThisSession(entryId) {
  return sessionTouchedIds.has(entryId);
}

export function markTouchedThisSession(entryId) {
  sessionTouchedIds.add(entryId);
}

export function clearSessionTouch(entryId) {
  sessionTouchedIds.delete(entryId);
}

// ---------------------------------------------------------------------------
// Navigate-away prompt suppression
// ---------------------------------------------------------------------------

export function isPromptSuppressed() {
  return suppressPromptThisSession;
}

export function suppressPrompt() {
  suppressPromptThisSession = true;
}

export function unsuppressPrompt() {
  suppressPromptThisSession = false;
}

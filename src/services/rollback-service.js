// Pure entry-checkpoint helpers: checkpoint creation, capped insertion, and session-touch tracking.
// No React imports — safe to call from hooks or other services.
import { ROLLBACK_MAX_CUSTOM } from '../constants/limits.js';

// Entries touched (first edit) in this page session — used by auto-checkpoint logic.
// Module-level so it survives re-renders without a ref or store.
const sessionTouchedIds = new Set();

// ---------------------------------------------------------------------------
// Checkpoint shape
// ---------------------------------------------------------------------------

/** Build a checkpoint object from an entry's current content fields. */
export function buildSnapshot(entry) {
  return {
    name:        entry.name,
    type:        entry.type,
    description: entry.description,
    triggers:    [...entry.triggers],
    timestamp:   Date.now(),
    label:       '',  // user-editable; empty means display the formatted timestamp
    pinned:      false,
  };
}

// ---------------------------------------------------------------------------
// Checkpoint array management
// ---------------------------------------------------------------------------

/**
 * Return a new checkpoints array with `snapshot` prepended and trimmed to `maxCount`.
 * Newest checkpoint is always at index 0.
 * Pinned checkpoints are never evicted — the array may exceed maxCount if all
 * remaining entries are pinned.
 */
export function addSnapshot(snapshots, snapshot, maxCount) {
  const capped  = Math.min(Math.max(1, maxCount), ROLLBACK_MAX_CUSTOM);
  const combined = [snapshot, ...snapshots];
  if (combined.length <= capped) return combined;

  // Trim from the tail, skipping pinned entries
  const result = [...combined];
  while (result.length > capped) {
    // Find the rightmost (oldest) unpinned snapshot
    let evicted = false;
    for (let i = result.length - 1; i >= 0; i--) {
      if (!result[i].pinned) {
        result.splice(i, 1);
        evicted = true;
        break;
      }
    }
    if (!evicted) break; // all remaining are pinned — stop trimming
  }
  return result;
}

// ---------------------------------------------------------------------------
// Content equality check
// ---------------------------------------------------------------------------

/**
 * Returns true if the entry's content fields exactly match the most recent
 * checkpoint. Used to avoid saving duplicate checkpoints.
 */
export function contentMatchesLatestSnapshot(entry, snapshots) {
  if (!snapshots || snapshots.length === 0) return false;
  const latest = snapshots[0];
  return (
    entry.name        === latest.name        &&
    entry.type        === latest.type        &&
    entry.description === latest.description &&
    entry.triggers.length === latest.triggers.length &&
    entry.triggers.every((t, i) => t === latest.triggers[i])
  );
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


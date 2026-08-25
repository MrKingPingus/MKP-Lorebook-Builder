// Hook for the Entry Checkpoints system — auto-checkpoint, manual save, overwrite, restore.
// Also exports useRollbackConfig() for the settings panel (no entry context required).
import { useLorebookStore }  from '../state/lorebook-store.js';
import { DEFAULT_LOREBOOK }  from '../constants/defaults.js';
import {
  buildSnapshot,
  addSnapshot,
  contentMatchesLatestSnapshot,
  hasBeenTouchedThisSession,
  markTouchedThisSession,
  clearSessionTouch,
} from '../services/rollback-service.js';

/**
 * Reads and writes the active lorebook's checkpoint config (enabled, snapshotCount, autoSnapshot).
 * For use in SettingsPanel — no entry context required.
 * The global rollbackDefaultEnabled setting is handled separately via useSettings().
 */
export function useRollbackConfig() {
  const setLorebookRollback = useLorebookStore((s) => s.setLorebookRollback);
  const rollbackConfig      = useLorebookStore((s) => {
    const id = s.activeLorebookId;
    return id ? (s.lorebooks[id]?.rollback ?? DEFAULT_LOREBOOK.rollback) : DEFAULT_LOREBOOK.rollback;
  });

  return {
    rollbackEnabled: rollbackConfig.enabled,
    snapshotCount:   rollbackConfig.snapshotCount,
    autoSnapshot:    rollbackConfig.autoSnapshot ?? true,
    setRollbackEnabled: (v) => setLorebookRollback({ enabled: v }),
    setSnapshotCount:   (v) => setLorebookRollback({ snapshotCount: v }),
    setAutoSnapshot:    (v) => setLorebookRollback({ autoSnapshot: v }),
  };
}

/**
 * @param {object}   entry    - the current entry object
 * @param {Function} onUpdate - updateEntry(id, patch, discrete?) from use-entries
 */
export function useRollback({ entry, onUpdate }) {
  const setLorebookRollback = useLorebookStore((s) => s.setLorebookRollback);
  const rollbackConfig      = useLorebookStore((s) => {
    const id = s.activeLorebookId;
    return id ? (s.lorebooks[id]?.rollback ?? DEFAULT_LOREBOOK.rollback) : DEFAULT_LOREBOOK.rollback;
  });

  const { enabled, snapshotCount, autoSnapshot = true } = rollbackConfig;
  const snapshots = entry.snapshots ?? [];

  // True once the entry has been edited this session and its current content is
  // not captured by the newest checkpoint. Drives the unsaved-changes dot on the
  // card's Checkpoints button — ambient, never blocking.
  const hasUnsavedChanges =
    enabled &&
    hasBeenTouchedThisSession(entry.id) &&
    !contentMatchesLatestSnapshot(entry, snapshots);

  // ── Checkpoint helpers ────────────────────────────────────────────────────

  function saveSnapshot() {
    if (contentMatchesLatestSnapshot(entry, snapshots)) return;
    const next = addSnapshot(snapshots, buildSnapshot(entry), snapshotCount);
    onUpdate(entry.id, { snapshots: next });
    clearSessionTouch(entry.id);
  }

  /**
   * Overwrite one existing checkpoint with the entry's current content, keeping
   * its position in the list. Used by the panel's per-checkpoint overwrite
   * action, which is the deliberate replacement for the old prompt's
   * "Replace Latest" — a choice about a named checkpoint rather than a storage
   * question asked at collapse time.
   */
  function overwriteSnapshot(index) {
    const target = snapshots[index];
    if (!target) return;
    const next = snapshots.map((s, i) => (
      i === index ? { ...buildSnapshot(entry), label: s.label, pinned: s.pinned } : s
    ));
    onUpdate(entry.id, { snapshots: next }, true);
    clearSessionTouch(entry.id);
  }

  // ── Auto-snapshot on first edit ───────────────────────────────────────────

  /**
   * Call this before applying any edit update.
   * In auto mode: silently checkpoints the pre-edit state on the first edit.
   * In manual mode: only marks the entry as touched, which surfaces the
   * unsaved-changes dot (no checkpoint is saved automatically).
   */
  function onBeforeEdit() {
    if (!enabled) return;
    if (hasBeenTouchedThisSession(entry.id)) return;
    markTouchedThisSession(entry.id);
    if (!autoSnapshot) return; // manual mode — touch-mark only, no auto-save
    if (contentMatchesLatestSnapshot(entry, snapshots)) return;
    const next = addSnapshot(snapshots, buildSnapshot(entry), snapshotCount);
    onUpdate(entry.id, { snapshots: next });
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  function restoreSnapshot(snapshot) {
    if (!contentMatchesLatestSnapshot(entry, snapshots)) {
      const preRestoreSnapshots = addSnapshot(snapshots, buildSnapshot(entry), snapshotCount);
      onUpdate(entry.id, { snapshots: preRestoreSnapshots });
    }
    onUpdate(entry.id, {
      name:        snapshot.name,
      type:        snapshot.type,
      description: snapshot.description,
      triggers:    [...snapshot.triggers],
    }, true);
    clearSessionTouch(entry.id);
  }

  // ── Snapshot list management ──────────────────────────────────────────────

  function updateSnapshotLabel(index, label) {
    const next = snapshots.map((s, i) => (i === index ? { ...s, label } : s));
    onUpdate(entry.id, { snapshots: next });
  }

  function toggleSnapshotPin(index) {
    const next = snapshots.map((s, i) => (i === index ? { ...s, pinned: !s.pinned } : s));
    onUpdate(entry.id, { snapshots: next });
  }

  function deleteSnapshot(index) {
    const next = snapshots.filter((_, i) => i !== index);
    onUpdate(entry.id, { snapshots: next }, true);
  }

  // ── Per-lorebook config setters ───────────────────────────────────────────

  function setRollbackEnabled(value) {
    setLorebookRollback({ enabled: value });
  }

  function setSnapshotCount(count) {
    setLorebookRollback({ snapshotCount: count });
  }

  return {
    enabled,
    snapshotCount,
    snapshots,
    hasUnsavedChanges,
    onBeforeEdit,
    saveSnapshot,
    overwriteSnapshot,
    restoreSnapshot,
    updateSnapshotLabel,
    toggleSnapshotPin,
    deleteSnapshot,
    setRollbackEnabled,
    setSnapshotCount,
  };
}

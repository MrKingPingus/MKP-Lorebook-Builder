// Hook for the entry rollback system — auto-snapshot, navigate-away prompt, manual save, restore.
// Also exports useRollbackConfig() for the settings panel (no entry context required).
import { useState, useRef }  from 'react';
import { useLorebookStore }  from '../state/lorebook-store.js';
import { DEFAULT_LOREBOOK }  from '../constants/defaults.js';
import {
  buildSnapshot,
  addSnapshot,
  contentMatchesLatestSnapshot,
  hasBeenTouchedThisSession,
  markTouchedThisSession,
  clearSessionTouch,
  isPromptSuppressed,
  suppressPrompt,
  unsuppressPrompt,
} from '../services/rollback-service.js';

/**
 * Reads and writes the active lorebook's rollback config (enabled, snapshotCount, autoSnapshot).
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

  const [promptVisible, setPromptVisible]       = useState(false);
  // Mirror the module-level suppress flag in React state so the UI re-renders when it changes
  const [promptSuppressed, setPromptSuppressed] = useState(() => isPromptSuppressed());
  const pendingCollapseRef = useRef(null);

  // ── Snapshot helpers ──────────────────────────────────────────────────────

  function saveSnapshot() {
    if (contentMatchesLatestSnapshot(entry, snapshots)) return;
    const next = addSnapshot(snapshots, buildSnapshot(entry), snapshotCount);
    onUpdate(entry.id, { snapshots: next });
    clearSessionTouch(entry.id);
  }

  function replaceLatestSnapshot() {
    if (snapshots.length === 0) { saveSnapshot(); return; }
    if (contentMatchesLatestSnapshot(entry, snapshots)) {
      clearSessionTouch(entry.id);
      return;
    }
    const firstUnpinnedIdx = snapshots.findIndex((s) => !s.pinned);
    if (firstUnpinnedIdx === -1) { saveSnapshot(); return; }
    const next = snapshots.map((s, i) => (i === firstUnpinnedIdx ? buildSnapshot(entry) : s));
    onUpdate(entry.id, { snapshots: next });
    clearSessionTouch(entry.id);
  }

  // ── Auto-snapshot on first edit ───────────────────────────────────────────

  /**
   * Call this before applying any edit update.
   * In auto mode: silently snapshots the pre-edit state on the first edit.
   * In manual mode: only marks the entry as touched so the navigate-away
   * prompt still fires on close (no snapshot is saved automatically).
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

  // ── Navigate-away prompt ──────────────────────────────────────────────────

  function handleCollapseIntent(collapseCallback) {
    if (!enabled || !hasBeenTouchedThisSession(entry.id)) {
      collapseCallback();
      return;
    }
    if (promptSuppressed) {
      saveSnapshot();
      collapseCallback();
      return;
    }
    pendingCollapseRef.current = collapseCallback;
    setPromptVisible(true);
  }

  function _finishCollapse() {
    const cb = pendingCollapseRef.current;
    pendingCollapseRef.current = null;
    setPromptVisible(false);
    cb?.();
  }

  function promptSaveNew(suppressThisSession = false) {
    if (suppressThisSession) {
      suppressPrompt();
      setPromptSuppressed(true);
    }
    saveSnapshot();
    _finishCollapse();
  }

  function promptReplace(suppressThisSession = false) {
    if (suppressThisSession) {
      suppressPrompt();
      setPromptSuppressed(true);
    }
    replaceLatestSnapshot();
    _finishCollapse();
  }

  function dismissPrompt() {
    pendingCollapseRef.current = null;
    setPromptVisible(false);
  }

  function reEnablePrompt() {
    unsuppressPrompt();
    setPromptSuppressed(false);
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
    onUpdate(entry.id, { snapshots: next });
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
    promptVisible,
    promptSuppressed,
    onBeforeEdit,
    saveSnapshot,
    handleCollapseIntent,
    promptSaveNew,
    promptReplace,
    dismissPrompt,
    reEnablePrompt,
    restoreSnapshot,
    updateSnapshotLabel,
    toggleSnapshotPin,
    deleteSnapshot,
    setRollbackEnabled,
    setSnapshotCount,
  };
}

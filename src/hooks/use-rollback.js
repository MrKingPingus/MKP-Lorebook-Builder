// Hook for the entry rollback system — auto-snapshot, navigate-away prompt, manual save, restore.
// Also exports useRollbackConfig() for the settings panel (no entry context required).
import { useState, useRef }  from 'react';
import { useLorebookStore }  from '../state/lorebook-store.js';
import { DEFAULT_LOREBOOK }  from '../constants/defaults.js';
import {
  buildSnapshot,
  addSnapshot,
  hasBeenTouchedThisSession,
  markTouchedThisSession,
  isPromptSuppressed,
  suppressPrompt,
} from '../services/rollback-service.js';

/**
 * Reads and writes the active lorebook's rollback config (enabled, snapshotCount).
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
    setRollbackEnabled: (v) => setLorebookRollback({ enabled: v }),
    setSnapshotCount:   (v) => setLorebookRollback({ snapshotCount: v }),
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

  const { enabled, snapshotCount } = rollbackConfig;
  const snapshots = entry.snapshots ?? [];

  const [promptVisible, setPromptVisible] = useState(false);
  const pendingCollapseRef = useRef(null); // stores the deferred collapse callback

  // ── Snapshot helpers ──────────────────────────────────────────────────────

  function saveSnapshot() {
    const next = addSnapshot(snapshots, buildSnapshot(entry), snapshotCount);
    onUpdate(entry.id, { snapshots: next });
  }

  function replaceLatestSnapshot() {
    if (snapshots.length === 0) { saveSnapshot(); return; }
    const next = [buildSnapshot(entry), ...snapshots.slice(1)];
    onUpdate(entry.id, { snapshots: next });
  }

  // ── Auto-snapshot on first edit ───────────────────────────────────────────

  /** Call this before applying any edit update. Silently snapshots the pre-edit state. */
  function onBeforeEdit() {
    if (!enabled) return;
    if (hasBeenTouchedThisSession(entry.id)) return;
    markTouchedThisSession(entry.id);
    const next = addSnapshot(snapshots, buildSnapshot(entry), snapshotCount);
    onUpdate(entry.id, { snapshots: next });
  }

  // ── Navigate-away prompt ──────────────────────────────────────────────────

  /**
   * Intercepts a collapse / close action.
   * If rollback is on and the entry was edited this session, shows the
   * "Replace or Save New" prompt (unless prompts are suppressed).
   */
  function handleCollapseIntent(collapseCallback) {
    if (!enabled || !hasBeenTouchedThisSession(entry.id)) {
      collapseCallback();
      return;
    }
    if (isPromptSuppressed()) {
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

  /** Prompt: "Save New" — append a new snapshot, then collapse */
  function promptSaveNew(suppressThisSession = false) {
    if (suppressThisSession) suppressPrompt();
    saveSnapshot();
    _finishCollapse();
  }

  /** Prompt: "Replace" — overwrite the latest snapshot, then collapse */
  function promptReplace(suppressThisSession = false) {
    if (suppressThisSession) suppressPrompt();
    replaceLatestSnapshot();
    _finishCollapse();
  }

  /** Prompt: Cancel — dismiss the prompt, keep the entry open */
  function dismissPrompt() {
    pendingCollapseRef.current = null;
    setPromptVisible(false);
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  /**
   * Apply a snapshot's content to the entry. Undoable via undo/redo.
   * Automatically saves the current state as a new snapshot first, so the
   * user can recover whatever they had before restoring.
   */
  function restoreSnapshot(snapshot) {
    // Auto-save the current state before overwriting it
    const preRestoreSnapshots = addSnapshot(snapshots, buildSnapshot(entry), snapshotCount);
    onUpdate(entry.id, { snapshots: preRestoreSnapshots });

    // Apply the restored content (discrete = true → pushed to undo/redo history)
    onUpdate(entry.id, {
      name:        snapshot.name,
      type:        snapshot.type,
      description: snapshot.description,
      triggers:    [...snapshot.triggers],
    }, true);
  }

  // ── Snapshot list management ──────────────────────────────────────────────

  function updateSnapshotLabel(index, label) {
    const next = snapshots.map((s, i) => (i === index ? { ...s, label } : s));
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
    onBeforeEdit,
    saveSnapshot,
    handleCollapseIntent,
    promptSaveNew,
    promptReplace,
    dismissPrompt,
    restoreSnapshot,
    updateSnapshotLabel,
    deleteSnapshot,
    setRollbackEnabled,
    setSnapshotCount,
  };
}

// Expose undo(), redo(), canUndo, and canRedo derived from history-store
import { useHistoryStore } from '../state/history-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { foldersOf } from '../services/folder-tree.js';

export function useUndoRedo() {
  const undoStack = useHistoryStore((s) => s.undoStack);
  const redoStack = useHistoryStore((s) => s.redoStack);
  const historyUndo = useHistoryStore((s) => s.undo);
  const historyRedo = useHistoryStore((s) => s.redo);
  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const updateActiveEntriesAndFolders = useLorebookStore((s) => s.updateActiveEntriesAndFolders);
  const getActiveLorebook = useLorebookStore((s) => s.getActiveLorebook);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // The state we're leaving, pushed onto the opposite stack. Always carries
  // folders so a step back out of an undo restores them exactly.
  function currentSnapshot() {
    const lorebook = getActiveLorebook();
    if (!lorebook) return null;
    return { entries: [...lorebook.entries], folders: [...foldersOf(lorebook)] };
  }

  // Most snapshots only carry entries — those ops never touched the folder
  // layer, so restoring folders from them would be wrong. Only a snapshot that
  // explicitly captured folders writes them back.
  function restore(snapshot) {
    if (!snapshot) return;
    if (snapshot.folders) {
      updateActiveEntriesAndFolders(snapshot.entries, snapshot.folders);
    } else {
      updateActiveEntries(snapshot.entries);
    }
  }

  function undo() {
    restore(historyUndo(currentSnapshot()));
  }

  function redo() {
    restore(historyRedo(currentSnapshot()));
  }

  return { undo, redo, canUndo, canRedo };
}

// Expose undo(), redo(), canUndo, and canRedo derived from history-store
import { useHistoryStore } from '../state/history-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';

export function useUndoRedo() {
  const undoStack = useHistoryStore((s) => s.undoStack);
  const redoStack = useHistoryStore((s) => s.redoStack);
  const historyUndo = useHistoryStore((s) => s.undo);
  const historyRedo = useHistoryStore((s) => s.redo);
  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  function undo() {
    const snapshot = historyUndo();
    if (snapshot) updateActiveEntries(snapshot.entries);
  }

  function redo() {
    const snapshot = historyRedo();
    if (snapshot) updateActiveEntries(snapshot.entries);
  }

  return { undo, redo, canUndo, canRedo };
}

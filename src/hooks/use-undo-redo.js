// Expose undo(), redo(), canUndo, and canRedo derived from the per-lorebook history store
import { useHistoryStore }  from '../state/history-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';

export function useUndoRedo() {
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const updateEntries    = useLorebookStore((s) => s.updateEntries);
  const histories        = useHistoryStore((s) => s.histories);
  const historyUndo      = useHistoryStore((s) => s.undo);
  const historyRedo      = useHistoryStore((s) => s.redo);

  const h       = activeLorebookId ? histories[activeLorebookId] : null;
  const canUndo = (h?.undoStack?.length ?? 0) > 0;
  const canRedo = (h?.redoStack?.length ?? 0) > 0;

  function undo() {
    if (!activeLorebookId) return;
    const lb      = lorebooks[activeLorebookId];
    const current = lb ? { entries: [...lb.entries] } : null;
    const snapshot = historyUndo(activeLorebookId, current);
    if (snapshot) updateEntries(activeLorebookId, snapshot.entries);
  }

  function redo() {
    if (!activeLorebookId) return;
    const lb      = lorebooks[activeLorebookId];
    const current = lb ? { entries: [...lb.entries] } : null;
    const snapshot = historyRedo(activeLorebookId, current);
    if (snapshot) updateEntries(activeLorebookId, snapshot.entries);
  }

  return { undo, redo, canUndo, canRedo };
}

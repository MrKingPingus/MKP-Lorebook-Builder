// Zustand store: undo and redo stacks holding full lorebook state snapshots
import { create } from 'zustand';

const MAX_HISTORY = 50;

export const useHistoryStore = create((set, get) => ({
  undoStack: [], // array of lorebook snapshots (oldest at index 0)
  redoStack: [],

  pushSnapshot: (snapshot) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-MAX_HISTORY + 1), snapshot],
      redoStack: [],
    })),

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const snapshot = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, snapshot],
    });
    return snapshot;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const snapshot = redoStack[redoStack.length - 1];
    set({
      undoStack: [...undoStack, snapshot],
      redoStack: redoStack.slice(0, -1),
    });
    return snapshot;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clear: () => set({ undoStack: [], redoStack: [] }),
}));

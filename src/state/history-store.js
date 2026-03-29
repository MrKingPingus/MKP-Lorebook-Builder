// Zustand store: undo and redo stacks holding full lorebook state snapshots
import { create } from 'zustand';
import { MAX_HISTORY } from '../constants/limits.js';

export const useHistoryStore = create((set, get) => ({
  undoStack: [], // array of lorebook snapshots (oldest at index 0)
  redoStack: [],

  pushSnapshot: (snapshot) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-MAX_HISTORY + 1), snapshot],
      redoStack: [],
    })),

  undo: (currentSnapshot) => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const snapshot = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: currentSnapshot ? [...redoStack, currentSnapshot] : redoStack,
    });
    return snapshot;
  },

  redo: (currentSnapshot) => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const snapshot = redoStack[redoStack.length - 1];
    set({
      undoStack: currentSnapshot ? [...undoStack, currentSnapshot] : undoStack,
      redoStack: redoStack.slice(0, -1),
    });
    return snapshot;
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clear: () => set({ undoStack: [], redoStack: [] }),
}));

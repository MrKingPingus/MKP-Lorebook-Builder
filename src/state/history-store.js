// Zustand store: per-lorebook undo/redo stacks keyed by lorebook id.
//
// Each lorebook maintains its own { undoStack, redoStack }. Callers must pass
// the lorebook id that the snapshot or operation applies to. This isolates
// history between lorebooks so a snapshot taken in lorebook A can never be
// restored into lorebook B, which matters once two lorebooks are editable
// simultaneously in crosstalk mode.
import { create } from 'zustand';
import { MAX_HISTORY } from '../constants/limits.js';

const EMPTY = { undoStack: [], redoStack: [] };

export const useHistoryStore = create((set, get) => ({
  histories: {}, // { [lorebookId]: { undoStack, redoStack } }

  pushSnapshot: (lorebookId, snapshot) =>
    set((state) => {
      if (!lorebookId) return {};
      const existing = state.histories[lorebookId] ?? EMPTY;
      return {
        histories: {
          ...state.histories,
          [lorebookId]: {
            undoStack: [...existing.undoStack.slice(-MAX_HISTORY + 1), snapshot],
            redoStack: [],
          },
        },
      };
    }),

  undo: (lorebookId, currentSnapshot) => {
    if (!lorebookId) return null;
    const { histories } = get();
    const h = histories[lorebookId];
    if (!h || h.undoStack.length === 0) return null;
    const snapshot = h.undoStack[h.undoStack.length - 1];
    set((state) => ({
      histories: {
        ...state.histories,
        [lorebookId]: {
          undoStack: h.undoStack.slice(0, -1),
          redoStack: currentSnapshot ? [...h.redoStack, currentSnapshot] : h.redoStack,
        },
      },
    }));
    return snapshot;
  },

  redo: (lorebookId, currentSnapshot) => {
    if (!lorebookId) return null;
    const { histories } = get();
    const h = histories[lorebookId];
    if (!h || h.redoStack.length === 0) return null;
    const snapshot = h.redoStack[h.redoStack.length - 1];
    set((state) => ({
      histories: {
        ...state.histories,
        [lorebookId]: {
          undoStack: currentSnapshot ? [...h.undoStack, currentSnapshot] : h.undoStack,
          redoStack: h.redoStack.slice(0, -1),
        },
      },
    }));
    return snapshot;
  },

  clearFor: (lorebookId) =>
    set((state) => {
      if (!lorebookId || !state.histories[lorebookId]) return {};
      const { [lorebookId]: _removed, ...rest } = state.histories;
      return { histories: rest };
    }),

  clear: () => set({ histories: {} }),
}));

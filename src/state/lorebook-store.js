// Zustand store: active lorebook id, all lorebooks map, and dispatch actions
import { create } from 'zustand';

export const useLorebookStore = create((set, get) => ({
  // id of the currently active lorebook
  activeLorebookId: null,

  // map of id -> lorebook object { id, name, entries: [] }
  lorebooks: {},

  // lorebook index array: [{ id, name, key, updatedAt }]
  lorebookIndex: [],

  // --- actions ---

  setActiveLorebookId: (id) => set({ activeLorebookId: id }),

  setLorebooks: (lorebooks) => set({ lorebooks }),

  setLorebookIndex: (lorebookIndex) => set({ lorebookIndex }),

  setLorebook: (lorebook) =>
    set((state) => ({
      lorebooks: { ...state.lorebooks, [lorebook.id]: lorebook },
    })),

  updateActiveEntries: (entries) =>
    set((state) => {
      const id = state.activeLorebookId;
      if (!id) return {};
      return {
        lorebooks: {
          ...state.lorebooks,
          [id]: { ...state.lorebooks[id], entries },
        },
      };
    }),

  updateEntry: (id, patch) =>
    set((state) => {
      const activeId = state.activeLorebookId;
      if (!activeId) return {};
      const lorebook = state.lorebooks[activeId];
      if (!lorebook) return {};
      return {
        lorebooks: {
          ...state.lorebooks,
          [activeId]: {
            ...lorebook,
            entries: lorebook.entries.map((e) =>
              e.id === id ? { ...e, ...patch, lastModified: Date.now() } : e
            ),
          },
        },
      };
    }),

  updateActiveName: (name) =>
    set((state) => {
      const id = state.activeLorebookId;
      if (!id) return {};
      return {
        lorebooks: {
          ...state.lorebooks,
          [id]: { ...state.lorebooks[id], name },
        },
        lorebookIndex: state.lorebookIndex.map((item) =>
          item.id === id ? { ...item, name, updatedAt: Date.now() } : item
        ),
      };
    }),

  renameLorebookById: (id, name) =>
    set((state) => ({
      lorebooks: state.lorebooks[id]
        ? { ...state.lorebooks, [id]: { ...state.lorebooks[id], name } }
        : state.lorebooks,
      lorebookIndex: state.lorebookIndex.map((item) =>
        item.id === id ? { ...item, name, updatedAt: Date.now() } : item
      ),
    })),

  removeLorebook: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.lorebooks;
      return {
        lorebooks: rest,
        lorebookIndex: state.lorebookIndex.filter((item) => item.id !== id),
      };
    }),

  updateAllowedOverlaps: (allowedOverlaps) =>
    set((state) => {
      const id = state.activeLorebookId;
      if (!id) return {};
      return {
        lorebooks: {
          ...state.lorebooks,
          [id]: { ...state.lorebooks[id], allowedOverlaps },
        },
      };
    }),

  setLorebookRollback: (patch) =>
    set((state) => {
      const id = state.activeLorebookId;
      if (!id) return {};
      const lorebook = state.lorebooks[id];
      if (!lorebook) return {};
      return {
        lorebooks: {
          ...state.lorebooks,
          [id]: {
            ...lorebook,
            rollback: { ...lorebook.rollback, ...patch },
          },
        },
      };
    }),

  getActiveLorebook: () => {
    const { activeLorebookId, lorebooks } = get();
    return activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  },
}));

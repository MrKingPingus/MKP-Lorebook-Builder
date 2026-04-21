// Zustand store: active + reference lorebook ids, all lorebooks map, and dispatch actions
import { create } from 'zustand';

export const useLorebookStore = create((set, get) => ({
  // id of the currently active (editable) lorebook
  activeLorebookId: null,

  // id of the read-only reference lorebook shown beside active in crosstalk
  // mode. Must never equal activeLorebookId. Ephemeral — not persisted.
  referenceLorebookId: null,

  // map of id -> lorebook object { id, name, entries: [] }
  lorebooks: {},

  // lorebook index array: [{ id, name, key, updatedAt }]
  lorebookIndex: [],

  // --- actions ---

  setActiveLorebookId: (id) =>
    set((state) => {
      // Invariant: reference ≠ active. If caller sets active to the current
      // reference id, push the old active into the reference slot — unless
      // the old active has already been removed from storage, in which case
      // null the reference to avoid a dangling pointer.
      if (id !== null && id === state.referenceLorebookId) {
        const oldActive = state.activeLorebookId;
        const canSwap = oldActive !== null && state.lorebooks[oldActive];
        return {
          activeLorebookId: id,
          referenceLorebookId: canSwap ? oldActive : null,
        };
      }
      return { activeLorebookId: id };
    }),

  setReferenceLorebookId: (id) =>
    set((state) => {
      // Invariant: reference ≠ active. Symmetric to setActiveLorebookId.
      if (id !== null && id === state.activeLorebookId) {
        const oldRef = state.referenceLorebookId;
        const canSwap = oldRef !== null && state.lorebooks[oldRef];
        return {
          activeLorebookId: canSwap ? oldRef : null,
          referenceLorebookId: id,
        };
      }
      return { referenceLorebookId: id };
    }),

  // Trade places — old active becomes reference, old reference becomes active.
  // Used by the swap-on-edit-click handler on the reference panel.
  swapReference: () =>
    set((state) => ({
      activeLorebookId: state.referenceLorebookId,
      referenceLorebookId: state.activeLorebookId,
    })),

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
        // If the removed id was the reference, null it out so the reference
        // panel doesn't render a dangling pointer.
        ...(state.referenceLorebookId === id ? { referenceLorebookId: null } : {}),
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

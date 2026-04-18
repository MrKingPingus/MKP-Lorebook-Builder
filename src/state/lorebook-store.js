// Zustand store: dual-slot lorebook state, lorebook map, and dispatch actions.
//
// Dual-slot model:
//   leftId, rightId  — ids of the lorebooks loaded into each slot (either may be null)
//   focusSide        — which slot is currently focused ('left' | 'right')
//   activeLorebookId — mirrors the focused slot's id; kept in sync by every action
//                      that changes slot ids or focus, so existing call sites that
//                      read activeLorebookId continue to work without changes.
//
// In single-slot mode (the default — nothing has entered crosstalk), rightId is
// null and focusSide stays 'left'. All existing behavior is preserved.
import { create } from 'zustand';

function pickActiveId(focusSide, leftId, rightId) {
  return focusSide === 'left' ? leftId : rightId;
}

export const useLorebookStore = create((set, get) => ({
  leftId:    null,
  rightId:   null,
  focusSide: 'left',

  activeLorebookId: null,

  // map of id -> lorebook object { id, name, entries: [] }
  lorebooks: {},

  // lorebook index array: [{ id, name, key, updatedAt }]
  lorebookIndex: [],

  // --- slot & focus actions ---

  setFocusSide: (focusSide) =>
    set((state) => ({
      focusSide,
      activeLorebookId: pickActiveId(focusSide, state.leftId, state.rightId),
    })),

  setSlot: (side, id) =>
    set((state) => {
      const nextLeftId  = side === 'left'  ? id : state.leftId;
      const nextRightId = side === 'right' ? id : state.rightId;
      return {
        leftId:  nextLeftId,
        rightId: nextRightId,
        activeLorebookId: pickActiveId(state.focusSide, nextLeftId, nextRightId),
      };
    }),

  // Back-compat: callers that "set the active lorebook" actually mean "set the
  // focused slot". In single-slot mode this is always the left slot.
  setActiveLorebookId: (id) =>
    set((state) => {
      const nextLeftId  = state.focusSide === 'left'  ? id : state.leftId;
      const nextRightId = state.focusSide === 'right' ? id : state.rightId;
      return {
        leftId:           nextLeftId,
        rightId:          nextRightId,
        activeLorebookId: id,
      };
    }),

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

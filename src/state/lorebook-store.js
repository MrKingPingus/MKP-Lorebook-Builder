// Zustand store: dual-slot lorebook state, lorebook map, and dispatch actions.
//
// Dual-slot model:
//   leftId, rightId  — ids of the lorebooks loaded into each slot (either may be null)
//   focusSide        — which slot is currently focused ('left' | 'right')
//   activeLorebookId — mirrors the focused slot's id; kept in sync by every action
//                      that changes slot ids or focus, so existing call sites that
//                      read activeLorebookId continue to work without changes.
//
// Mutation actions take an explicit lorebookId as their first argument. Callers
// that want to act on the focused slot pass activeLorebookId; side-aware hooks
// resolve to leftId or rightId themselves.
import { create } from 'zustand';

function pickActiveId(focusSide, leftId, rightId) {
  return focusSide === 'left' ? leftId : rightId;
}

export const useLorebookStore = create((set, get) => ({
  leftId:    null,
  rightId:   null,
  focusSide: 'left',

  activeLorebookId: null,

  lorebooks:     {},
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

  // --- explicit-id mutators ---

  updateEntries: (id, entries) =>
    set((state) => {
      if (!id) return {};
      const lb = state.lorebooks[id];
      if (!lb) return {};
      return { lorebooks: { ...state.lorebooks, [id]: { ...lb, entries } } };
    }),

  updateEntry: (lorebookId, entryId, patch) =>
    set((state) => {
      if (!lorebookId) return {};
      const lb = state.lorebooks[lorebookId];
      if (!lb) return {};
      return {
        lorebooks: {
          ...state.lorebooks,
          [lorebookId]: {
            ...lb,
            entries: lb.entries.map((e) =>
              e.id === entryId ? { ...e, ...patch, lastModified: Date.now() } : e
            ),
          },
        },
      };
    }),

  updateName: (id, name) =>
    set((state) => {
      if (!id) return {};
      const lb = state.lorebooks[id];
      if (!lb) return {};
      return {
        lorebooks: { ...state.lorebooks, [id]: { ...lb, name } },
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

  updateAllowedOverlaps: (id, allowedOverlaps) =>
    set((state) => {
      if (!id) return {};
      const lb = state.lorebooks[id];
      if (!lb) return {};
      return { lorebooks: { ...state.lorebooks, [id]: { ...lb, allowedOverlaps } } };
    }),

  setLorebookRollback: (id, patch) =>
    set((state) => {
      if (!id) return {};
      const lb = state.lorebooks[id];
      if (!lb) return {};
      return {
        lorebooks: {
          ...state.lorebooks,
          [id]: { ...lb, rollback: { ...lb.rollback, ...patch } },
        },
      };
    }),

  getActiveLorebook: () => {
    const { activeLorebookId, lorebooks } = get();
    return activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  },
}));

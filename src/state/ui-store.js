// Zustand store: active tab, search query, type filter selection, window position/size, and expand/group flags
import { create } from 'zustand';
import { DEFAULT_WINDOW } from '../constants/defaults.js';

export const useUiStore = create((set) => ({
  activeMenuPanel:  null,     // null | 'lorebooks' | 'import-export' | 'settings' — slide tray panel
  searchQuery: '',
  searchMode:  'search',    // 'search' | 'find-replace' | 'select'
  selectedIds: new Set(),   // Set<entryId> — entries selected while searchMode === 'select'
  selectionSide: null,      // 'active' | 'reference' | null — which side the current selection
                            //   was clicked from. Locks "Copy to other panel" semantics.
  typeFilter:  [],          // empty = show all
  windowPos:   { x: DEFAULT_WINDOW.x, y: DEFAULT_WINDOW.y },
  windowSize:  { width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height },
  collapseAll: false,
  expandAll:   false,
  groupByType: false,
  sortMode:    'default',    // 'default' | 'alpha-asc' | 'alpha-desc' | 'last-modified'
  savedAt:     null,        // timestamp of last successful save (for SaveBadge)
  showLander:       true,        // true on every page load; dismissed when user enters the builder
  showAppendImport: false,       // true when footer "Import Entries" overlay is open
  activeEntryId:        null,  // mobile entry detail panel — id of the entry being edited, or null
  searchFocusedId:      null,  // entry id forced-expanded by search navigation; null = no override
  pendingFocusEntryId:       null,   // id of newly-created entry that should receive auto-focus; cleared once consumed
  pendingFocusLorebookName:  false,  // true after new lorebook created; WindowHeader focuses name input then resets
  activeSide: 'left',          // 'left' | 'right' — which physical slot holds the active lorebook in crosstalk mode.
                               //   swapReference flips roles AND this flag so the clicked panel stays put.

  setActiveMenuPanel: (id) => set((s) => ({ activeMenuPanel: s.activeMenuPanel === id ? null : id })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode:  (searchMode)  =>
    set((state) => {
      // Leaving select mode clears any lingering selection (and its side).
      if (state.searchMode === 'select' && searchMode !== 'select' && state.selectedIds.size > 0) {
        return { searchMode, selectedIds: new Set(), selectionSide: null };
      }
      return { searchMode };
    }),
  toggleSelected: (id, side) =>
    set((state) => {
      // Switching sides mid-selection: clear the existing selection and start
      // a fresh one on the side the user just clicked.
      if (state.selectionSide && side && state.selectionSide !== side) {
        return { selectedIds: new Set([id]), selectionSide: side };
      }
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return {
        selectedIds: next,
        selectionSide: next.size === 0 ? null : (state.selectionSide ?? side ?? null),
      };
    }),
  clearSelection:   ()    => set({ selectedIds: new Set(), selectionSide: null }),
  selectAllVisible: (ids, side) =>
    set((state) => {
      // If the user is on a different side than the existing selection, clear
      // and switch — same rule as toggleSelected.
      const baseSet = (state.selectionSide && side && state.selectionSide !== side)
        ? new Set()
        : new Set(state.selectedIds);
      for (const id of ids) baseSet.add(id);
      return {
        selectedIds: baseSet,
        selectionSide: baseSet.size === 0 ? null : (side ?? state.selectionSide ?? null),
      };
    }),
  setTypeFilter:  (typeFilter)  => set({ typeFilter }),
  setWindowPos:   (windowPos)   => set({ windowPos }),
  setWindowSize:  (windowSize)  => set({ windowSize }),
  setCollapseAll: (collapseAll) => set({ collapseAll }),
  setExpandAll:   (expandAll)   => set({ expandAll }),
  setGroupByType: (groupByType) => set({ groupByType }),
  setSortMode:    (sortMode)    => set({ sortMode }),
  setSearchFocusedId:  (searchFocusedId)  => set({ searchFocusedId }),
  setSavedAt:          (savedAt)          => set({ savedAt }),
  setShowLander:       (showLander)       => set({ showLander }),
  setShowAppendImport: (showAppendImport) => set({ showAppendImport }),
  setActiveEntryId:        (activeEntryId)        => set({ activeEntryId }),
  setPendingFocusEntryId:       (pendingFocusEntryId)       => set({ pendingFocusEntryId }),
  setPendingFocusLorebookName:  (pendingFocusLorebookName)  => set({ pendingFocusLorebookName }),
  toggleActiveSide: () => set((s) => ({ activeSide: s.activeSide === 'left' ? 'right' : 'left' })),

  toggleTypeFilter: (typeId) =>
    set((state) => {
      const active = state.typeFilter;
      return {
        typeFilter: active.includes(typeId)
          ? active.filter((t) => t !== typeId)
          : [...active, typeId],
      };
    }),
}));

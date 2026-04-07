// Zustand store: active tab, search query, type filter selection, window position/size, and expand/group flags
import { create } from 'zustand';
import { DEFAULT_WINDOW } from '../constants/defaults.js';

export const useUiStore = create((set) => ({
  activeMenuPanel:  null,     // null | 'lorebooks' | 'import-export' | 'settings' — slide tray panel
  searchQuery: '',
  searchMode:  'search',    // 'search' | 'find-replace'
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

  setActiveMenuPanel: (id) => set((s) => ({ activeMenuPanel: s.activeMenuPanel === id ? null : id })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode:  (searchMode)  => set({ searchMode }),
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

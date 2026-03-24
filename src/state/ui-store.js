// Zustand store: active tab, search query, type filter selection, window position/size, and expand/group flags
import { create } from 'zustand';
import { DEFAULT_WINDOW } from '../constants/defaults.js';

export const useUiStore = create((set) => ({
  activeTab:   'build',     // 'build' | 'import-export' | 'settings'
  searchQuery: '',
  searchMode:  'search',    // 'search' | 'find-replace'
  typeFilter:  [],          // empty = show all
  windowPos:   { x: DEFAULT_WINDOW.x, y: DEFAULT_WINDOW.y },
  windowSize:  { width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height },
  collapseAll: false,
  expandAll:   false,
  groupByType: false,
  savedAt:     null,        // timestamp of last successful save (for SaveBadge)

  setActiveTab:   (activeTab)   => set({ activeTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode:  (searchMode)  => set({ searchMode }),
  setTypeFilter:  (typeFilter)  => set({ typeFilter }),
  setWindowPos:   (windowPos)   => set({ windowPos }),
  setWindowSize:  (windowSize)  => set({ windowSize }),
  setCollapseAll: (collapseAll) => set({ collapseAll }),
  setExpandAll:   (expandAll)   => set({ expandAll }),
  setGroupByType: (groupByType) => set({ groupByType }),
  setSavedAt:     (savedAt)     => set({ savedAt }),

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

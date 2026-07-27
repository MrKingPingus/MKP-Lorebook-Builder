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
  stagedTypes: new Map(),   // Map<entryId, typeId> — per-row staged type changes in select mode,
                            //   committed in a batch via Apply Staged Types. Cleared on exit
                            //   select mode, on deselect of an entry, and on apply.
  typeFilter:  [],          // empty = show all
  folderFilter: [],         // folder ids (plus the UNFILED_FILTER_ID sentinel); empty = show all.
                            //   Active-book only — folder ids are per-book, so the reference
                            //   pane ignores this. Stale ids are pruned on read, which is what
                            //   makes a deleted folder or a crosstalk role swap harmless.
  windowPos:   { x: DEFAULT_WINDOW.x, y: DEFAULT_WINDOW.y },
  windowSize:  { width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height },
  bulkExpanded:     false,   // last bulk action was Expand All — drives the Expand/Collapse All button label only
  expandAllNonce:   0,       // bumped by Expand All; each card commits localCollapsed=false when it changes
  collapseAllNonce: 0,       // bumped by Collapse All; each card commits localCollapsed=true when it changes
  groupByType: false,
  sortMode:    'default',    // 'default' | 'alpha-asc' | 'alpha-desc' | 'last-modified'
  savedAt:     null,        // timestamp of last successful save (for SaveBadge)
  showLander:       true,        // true on every page load; dismissed when user enters the builder
  showAppendImport: false,       // true when footer "Import Entries" overlay is open
  exportMenuAnchor: null,        // {top,left,right,bottom,width} rect of the hotbar button that opened the floating Export menu; null = closed
  activeEntryId:        null,  // mobile entry detail panel — id of the entry being edited, or null
  searchFocusedId:      null,  // entry id forced-expanded by search navigation; null = no override
  pendingFocusEntryId:       null,   // id of newly-created entry that should receive auto-focus; cleared once consumed
  pendingFocusFolderId:      null,   // id of newly-created folder whose header should open its rename input; cleared once consumed
  pendingFocusLorebookName:  false,  // true after new lorebook created; WindowHeader focuses name input then resets
  activeSide: 'left',          // 'left' | 'right' — which physical slot holds the active lorebook in crosstalk mode.
                               //   swapReference flips roles AND this flag so the clicked panel stays put.
  peekReferenceEntryId: null,  // mobile-only — id of the reference entry currently shown in the peek overlay; null = closed
  referenceBrowseOpen:  false, // mobile-only — true when the read-only reference browse sheet is open
  pickFromReferenceMode: false, // mobile-only — true while the user is in the swap-and-back "Pick from Reference" pose (browsing reference as if it were active to multi-select for copy back to original active)
  crossFlashId:          null,  // entry id currently flashing as the target of a cross-pane "in both books" jump; auto-clears on a timer
  compareEntryId:        null,  // active-side entry id currently in side-by-side compare mode against its same-named reference counterpart; null = not comparing
  keyboardHelpOpen:      false,  // true when the keyboard-shortcuts cheat-sheet overlay is open
  searchFocusNonce:      0,      // bumped by the focus-search hotkey; SearchBar focuses its input on change
  findFocusNonce:        0,      // bumped by the find/replace hotkey; SearchBar enters find-replace mode + focuses the find field
  pendingImportPick:     false,  // set by the import hotkey; AppendImportPanel switches to file mode + opens the OS picker, then clears
  pendingSettingsSection: null,  // accordion section id to auto-open next time the Settings panel mounts (deep-link); cleared once consumed

  setActiveMenuPanel: (id) => set((s) => ({ activeMenuPanel: s.activeMenuPanel === id ? null : id })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchMode:  (searchMode)  =>
    set((state) => {
      // Leaving select mode clears any lingering selection (and its side) and
      // any pending staged type changes.
      if (state.searchMode === 'select' && searchMode !== 'select') {
        return { searchMode, selectedIds: new Set(), selectionSide: null, stagedTypes: new Map() };
      }
      return { searchMode };
    }),
  toggleSelected: (id, side) =>
    set((state) => {
      // Switching sides mid-selection: clear the existing selection and start
      // a fresh one on the side the user just clicked. Staged types reset too
      // since they only make sense for the current selection.
      if (state.selectionSide && side && state.selectionSide !== side) {
        return { selectedIds: new Set([id]), selectionSide: side, stagedTypes: new Map() };
      }
      const next = new Set(state.selectedIds);
      const stagedNext = new Map(state.stagedTypes);
      if (next.has(id)) {
        next.delete(id);
        stagedNext.delete(id);
      } else {
        next.add(id);
      }
      return {
        selectedIds: next,
        selectionSide: next.size === 0 ? null : (state.selectionSide ?? side ?? null),
        stagedTypes: stagedNext,
      };
    }),
  clearSelection:   ()    => set({ selectedIds: new Set(), selectionSide: null, stagedTypes: new Map() }),
  setStagedType:    (id, typeId) =>
    set((state) => {
      const next = new Map(state.stagedTypes);
      if (typeId == null) next.delete(id);
      else                next.set(id, typeId);
      return { stagedTypes: next };
    }),
  clearStagedTypes: () => set({ stagedTypes: new Map() }),
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
  // Expand/Collapse All are one-shot pulses: bump a nonce that every card's
  // effect reads to commit its own local collapsed state. `bulkExpanded` is
  // only the button-label memory — individual card collapses never touch it,
  // so collapsing one card can't disturb the others.
  expandAllEntries:   () => set((s) => ({ bulkExpanded: true,  expandAllNonce:   s.expandAllNonce   + 1 })),
  collapseAllEntries: () => set((s) => ({ bulkExpanded: false, collapseAllNonce: s.collapseAllNonce + 1 })),
  setGroupByType: (groupByType) => set({ groupByType }),
  setSortMode:    (sortMode)    => set({ sortMode }),
  setSearchFocusedId:  (searchFocusedId)  => set({ searchFocusedId }),
  setSavedAt:          (savedAt)          => set({ savedAt }),
  setShowLander:       (showLander)       => set({ showLander }),
  setShowAppendImport: (showAppendImport) => set({ showAppendImport }),
  openExportMenu:  (rect) => set({ exportMenuAnchor: rect }),
  closeExportMenu: ()     => set({ exportMenuAnchor: null }),
  setActiveEntryId:        (activeEntryId)        => set({ activeEntryId }),
  setPendingFocusEntryId:       (pendingFocusEntryId)       => set({ pendingFocusEntryId }),
  setPendingFocusFolderId:      (pendingFocusFolderId)      => set({ pendingFocusFolderId }),
  setPendingFocusLorebookName:  (pendingFocusLorebookName)  => set({ pendingFocusLorebookName }),
  toggleActiveSide: () => set((s) => ({ activeSide: s.activeSide === 'left' ? 'right' : 'left' })),
  setPeekReferenceEntryId: (peekReferenceEntryId) => set({ peekReferenceEntryId }),
  setReferenceBrowseOpen:  (referenceBrowseOpen)  => set({ referenceBrowseOpen }),
  setPickFromReferenceMode: (pickFromReferenceMode) => set({ pickFromReferenceMode }),
  setCrossFlashId:          (crossFlashId)          => set({ crossFlashId }),
  setCompareEntryId:        (compareEntryId)        => set({ compareEntryId }),
  setKeyboardHelpOpen:      (keyboardHelpOpen)      => set({ keyboardHelpOpen }),
  toggleKeyboardHelp:       ()                      => set((s) => ({ keyboardHelpOpen: !s.keyboardHelpOpen })),
  requestSearchFocus:       ()                      => set((s) => ({ searchFocusNonce: s.searchFocusNonce + 1 })),
  requestFindFocus:         ()                      => set((s) => ({ findFocusNonce: s.findFocusNonce + 1 })),
  // Open the Import overlay and flag it to jump straight to the file picker.
  requestImportPick:        ()                      => set({ showAppendImport: true, pendingImportPick: true }),
  setPendingImportPick:     (pendingImportPick)     => set({ pendingImportPick }),
  // Open the floating Export menu centred on screen (no hotbar anchor).
  openExportMenuCentered:   ()                      => set({ exportMenuAnchor: 'center' }),
  setPendingSettingsSection: (pendingSettingsSection) => set({ pendingSettingsSection }),
  openSettingsSection:      (section)                => set({ activeMenuPanel: 'settings', pendingSettingsSection: section }),

  setFolderFilter: (folderFilter) => set({ folderFilter }),
  toggleFolderFilter: (folderId) =>
    set((state) => {
      const active = state.folderFilter;
      return {
        folderFilter: active.includes(folderId)
          ? active.filter((f) => f !== folderId)
          : [...active, folderId],
      };
    }),

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

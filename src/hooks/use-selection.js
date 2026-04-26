// Entry selection state for bulk operations — mode flag, per-card membership, and bulk actions
import { useUiStore } from '../state/ui-store.js';

// Full selection info — used by the bulk action bar
export function useSelection() {
  const searchMode       = useUiStore((s) => s.searchMode);
  const selectedIds      = useUiStore((s) => s.selectedIds);
  const selectionSide    = useUiStore((s) => s.selectionSide);
  const toggleSelected   = useUiStore((s) => s.toggleSelected);
  const clearSelection   = useUiStore((s) => s.clearSelection);
  const selectAllVisible = useUiStore((s) => s.selectAllVisible);
  const setSearchMode    = useUiStore((s) => s.setSearchMode);

  return {
    isSelectMode: searchMode === 'select',
    selectedIds,
    selectionSide,
    selectedCount: selectedIds.size,
    hasSelection:  selectedIds.size > 0,
    toggleSelected,
    clearSelection,
    selectAllVisible,
    exitSelectMode: () => setSearchMode('search'),
  };
}

// Narrow per-card subscription — re-renders only when this card's selected state flips
export function useIsSelected(id) {
  return useUiStore((s) => s.selectedIds.has(id));
}

// Mode flag only — used by EntryCard to switch its click behaviour
export function useIsSelectMode() {
  return useUiStore((s) => s.searchMode === 'select');
}

// Stable action reference — safe to pass to card click handlers without re-rendering
export function useToggleSelected() {
  return useUiStore((s) => s.toggleSelected);
}

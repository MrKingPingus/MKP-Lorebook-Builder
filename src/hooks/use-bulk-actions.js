// Bulk actions that operate on the current selection — pushes history snapshot then mutates active entries
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { changeTypeForIds } from '../services/find-replace.js';

export function useBulkActions() {
  const lorebooks           = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId    = useLorebookStore((s) => s.activeLorebookId);
  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot        = useHistoryStore((s) => s.pushSnapshot);
  const selectedIds         = useUiStore((s) => s.selectedIds);
  const clearSelection      = useUiStore((s) => s.clearSelection);
  const setSearchMode       = useUiStore((s) => s.setSearchMode);

  const entries = activeLorebookId ? lorebooks[activeLorebookId]?.entries ?? [] : [];

  function applyTypeChange(toType) {
    if (selectedIds.size === 0 || !toType) return;
    pushSnapshot({ entries: [...entries] });
    const updated = changeTypeForIds(entries, selectedIds, toType);
    updateActiveEntries(updated);
    clearSelection();
    setSearchMode('search');
  }

  return { applyTypeChange };
}

// Bulk actions that operate on the current selection — pushes history snapshot then mutates active entries
import { useLorebookStore }  from '../state/lorebook-store.js';
import { useHistoryStore }   from '../state/history-store.js';
import { useUiStore }        from '../state/ui-store.js';
import { useSideLorebookId } from './use-side.js';
import { changeTypeForIds }  from '../services/find-replace.js';

export function useBulkActions() {
  const targetId     = useSideLorebookId();
  const lorebooks    = useLorebookStore((s) => s.lorebooks);
  const updateEntries = useLorebookStore((s) => s.updateEntries);
  const pushSnapshot  = useHistoryStore((s) => s.pushSnapshot);
  const selectedIds   = useUiStore((s) => s.selectedIds);
  const clearSelection = useUiStore((s) => s.clearSelection);
  const setSearchMode  = useUiStore((s) => s.setSearchMode);

  const entries = targetId ? lorebooks[targetId]?.entries ?? [] : [];

  function applyTypeChange(toType) {
    if (selectedIds.size === 0 || !toType) return;
    pushSnapshot(targetId, { entries: [...entries] });
    const updated = changeTypeForIds(entries, selectedIds, toType);
    updateEntries(targetId, updated);
    clearSelection();
    setSearchMode('search');
  }

  return { applyTypeChange };
}

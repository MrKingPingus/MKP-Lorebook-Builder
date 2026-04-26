// Bulk actions that operate on the current selection — pushes history snapshot then mutates active entries
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { changeTypeForIds } from '../services/find-replace.js';
import { cloneEntry }       from '../services/entry-factory.js';

export function useBulkActions() {
  const lorebooks           = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId    = useLorebookStore((s) => s.activeLorebookId);
  const referenceLorebookId = useLorebookStore((s) => s.referenceLorebookId);
  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const setLorebook         = useLorebookStore((s) => s.setLorebook);
  const pushSnapshot        = useHistoryStore((s) => s.pushSnapshot);
  const selectedIds         = useUiStore((s) => s.selectedIds);
  const selectionSide       = useUiStore((s) => s.selectionSide);
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

  // Copy the selected entries from the side they were clicked on to the other
  // panel's lorebook. Clones get fresh ids and zeroed snapshots. We only push
  // a history snapshot when the destination is the active book, since the
  // history store is active-only — cross-book undo is the same caveat the
  // find-replace cross-book path already lives with.
  function copyToOtherPanel() {
    if (selectedIds.size === 0 || !selectionSide) return;
    const sourceBookId = selectionSide === 'active' ? activeLorebookId    : referenceLorebookId;
    const destBookId   = selectionSide === 'active' ? referenceLorebookId : activeLorebookId;
    if (!sourceBookId || !destBookId) return;

    const sourceLorebook = lorebooks[sourceBookId];
    const destLorebook   = lorebooks[destBookId];
    if (!sourceLorebook || !destLorebook) return;

    const sourceEntries = sourceLorebook.entries ?? [];
    const destEntries   = destLorebook.entries   ?? [];

    // Preserve source-array order so a multi-select copy lands in the same
    // top-to-bottom order on the destination side.
    const toClone = sourceEntries.filter((e) => selectedIds.has(e.id));
    if (toClone.length === 0) return;

    const clones = toClone.map(cloneEntry);

    if (destBookId === activeLorebookId) {
      pushSnapshot({ entries: [...destEntries] });
    }

    setLorebook({ ...destLorebook, entries: [...destEntries, ...clones] });

    clearSelection();
    setSearchMode('search');
  }

  return { applyTypeChange, copyToOtherPanel };
}

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
  const stagedTypes         = useUiStore((s) => s.stagedTypes);
  const clearSelection      = useUiStore((s) => s.clearSelection);
  const clearStagedTypes    = useUiStore((s) => s.clearStagedTypes);

  const entries = activeLorebookId ? lorebooks[activeLorebookId]?.entries ?? [] : [];

  // Bulk apply-to-all path. Select mode and selection persist after apply so
  // the user can chain further actions on the same set.
  function applyTypeChange(toType) {
    if (selectedIds.size === 0 || !toType) return;
    pushSnapshot({ entries: [...entries] });
    const updated = changeTypeForIds(entries, selectedIds, toType);
    updateActiveEntries(updated);
    // Any pending per-row stages get superseded by the apply-to-all result.
    clearStagedTypes();
  }

  // Commits per-row staged types in one batch. Only entries that are still
  // selected AND have a staged type that differs from their current type are
  // updated. No-op (no history snapshot) if nothing would change.
  function applyStagedTypes() {
    if (stagedTypes.size === 0) return;
    const hasWork = entries.some((e) =>
      selectedIds.has(e.id) && stagedTypes.has(e.id) && stagedTypes.get(e.id) !== e.type
    );
    if (!hasWork) { clearStagedTypes(); return; }
    pushSnapshot({ entries: [...entries] });
    const now = Date.now();
    const updated = entries.map((e) =>
      selectedIds.has(e.id) && stagedTypes.has(e.id) && stagedTypes.get(e.id) !== e.type
        ? { ...e, type: stagedTypes.get(e.id), lastModified: now }
        : e
    );
    updateActiveEntries(updated);
    clearStagedTypes();
  }

  // Bulk set hiddenFromExport across the selection. Mirrors applyTypeChange:
  // one history snapshot, only entries that actually flip are touched (so a
  // no-op change is a true no-op with no snapshot), and the selection persists
  // so the user can chain further bulk actions on the same set.
  function setHiddenForSelected(hidden) {
    if (selectedIds.size === 0) return;
    const hasWork = entries.some((e) => selectedIds.has(e.id) && !!e.hiddenFromExport !== hidden);
    if (!hasWork) return;
    pushSnapshot({ entries: [...entries] });
    const now = Date.now();
    const updated = entries.map((e) =>
      selectedIds.has(e.id) && !!e.hiddenFromExport !== hidden
        ? { ...e, hiddenFromExport: hidden, lastModified: now }
        : e
    );
    updateActiveEntries(updated);
  }

  // Bulk set isPublic (CharSnap Public/Private) across the selection. Same
  // shape as setHiddenForSelected. isPublic defaults to public, so an entry
  // counts as public unless it's explicitly false.
  function setPublicForSelected(makePublic) {
    if (selectedIds.size === 0) return;
    const isPub = (e) => e.isPublic === true;
    const hasWork = entries.some((e) => selectedIds.has(e.id) && isPub(e) !== makePublic);
    if (!hasWork) return;
    pushSnapshot({ entries: [...entries] });
    const now = Date.now();
    const updated = entries.map((e) =>
      selectedIds.has(e.id) && isPub(e) !== makePublic
        ? { ...e, isPublic: makePublic, lastModified: now }
        : e
    );
    updateActiveEntries(updated);
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
  }

  return { applyTypeChange, applyStagedTypes, copyToOtherPanel, setHiddenForSelected, setPublicForSelected };
}

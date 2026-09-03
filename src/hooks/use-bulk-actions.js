// Bulk actions that operate on the current selection — pushes history snapshot then mutates active entries
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { changeTypeForIds } from '../services/find-replace.js';
import { cloneEntry }       from '../services/entry-factory.js';
import { createFolder, assignEntriesToFolder, foldersOf } from '../services/folder-tree.js';
import { useEntryTransfer } from './use-entry-transfer.js';
import { saveLorebook }     from '../services/storage-service.js';

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

  const updateActiveEntriesAndFolders = useLorebookStore((s) => s.updateActiveEntriesAndFolders);
  const { transferTargets, canCreateTarget, transferTo, transferToNewLorebook, goToLorebook } = useEntryTransfer();

  const activeLorebook = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  const entries = activeLorebook?.entries ?? [];
  const folders = foldersOf(activeLorebook);

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

  // File the selection into a folder (folderId === null unfiles them). No-op
  // means no snapshot, as with the other bulk ops. The snapshot carries folders
  // too because the assignment also repositions entries[] around the folder.
  function moveSelectedToFolder(folderId) {
    if (selectedIds.size === 0 || selectionSide === 'reference') return;
    const target = folderId ?? null;
    const hasWork = entries.some((e) => selectedIds.has(e.id) && (e.folderId ?? null) !== target);
    if (!hasWork) return;
    pushSnapshot({ entries: [...entries], folders: [...folders] });
    updateActiveEntriesAndFolders(assignEntriesToFolder(entries, selectedIds, target), folders);
    // Unlike the type/visibility bulk ops, filing is a "that batch is done"
    // action — the next move is almost always a *different* set of entries into
    // a *different* folder, so holding the selection just gets in the way.
    // Matches copyToOtherPanel, which clears for the same reason.
    clearSelection();
  }

  // "Move to new folder…" — one snapshot covering both the new folder and the
  // entries filed into it. Folders live on the active book, so a selection made
  // on the reference side has nothing to file here: without this guard it would
  // create an empty folder in the active book and move nothing.
  function moveSelectedToNewFolder() {
    if (selectedIds.size === 0 || selectionSide === 'reference') return;
    if (!entries.some((e) => selectedIds.has(e.id))) return;
    pushSnapshot({ entries: [...entries], folders: [...folders] });
    const folder = createFolder(folders);
    updateActiveEntriesAndFolders(
      assignEntriesToFolder(entries, selectedIds, folder.id),
      [...folders, folder]
    );
    clearSelection();
    // A folder born from a selection always needs naming — send the header
    // straight into its rename input.
    useUiStore.getState().setPendingFocusFolderId(folder.id);
    return folder;
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

    const nextDest = { ...destLorebook, entries: [...destEntries, ...clones] };
    setLorebook(nextDest);
    // Written through rather than left to autosave, which only ever persists the
    // ACTIVE book. When the destination is the reference panel this was the
    // difference between a copy that survived a tab close and one that did not:
    // it stayed in memory until the user happened to switch to that book. Harmless
    // when the destination IS the active book — autosave would have written the
    // same thing 800ms later. No-ops for the tour's ephemeral samples, by design.
    saveLorebook(nextDest);

    clearSelection();
  }

  // Bulk copy/move to another lorebook (GitHub #127, locked decision 10). The
  // per-entry ⋯ menu and this share `use-entry-transfer.js` outright — the
  // service is the feature, the two entry points are just how you reach it.
  //
  // **Active-side selections only**, exactly like `moveSelectedToFolder` and for
  // a related reason. A move has to be undoable on the side it left, and the
  // history store holds the active lorebook and nothing else — so a move out of
  // the REFERENCE book would be silently unundoable, which is the one thing the
  // confirmation promises it is not. Swapping a book into the active slot is one
  // click, and this app already has that control.
  function transferSelectedTo(destId, mode) {
    if (selectedIds.size === 0 || selectionSide !== 'active') return null;
    const result = transferTo([...selectedIds], destId, mode);
    // Only on success: a cancelled confirm should leave the user where they
    // were, still holding the selection they were about to act on.
    if (result) clearSelection();
    return result;
  }

  function transferSelectedToNewLorebook(name, mode) {
    if (selectedIds.size === 0 || selectionSide !== 'active') return null;
    const result = transferToNewLorebook([...selectedIds], name, mode);
    if (result) clearSelection();
    return result;
  }

  return {
    applyTypeChange,
    applyStagedTypes,
    copyToOtherPanel,
    setHiddenForSelected,
    setPublicForSelected,
    moveSelectedToFolder,
    moveSelectedToNewFolder,
    transferTargets,
    canCreateTarget,
    transferSelectedTo,
    transferSelectedToNewLorebook,
    goToLorebook,
  };
}

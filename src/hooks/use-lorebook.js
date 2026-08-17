// Active lorebook data and lorebook-level actions: load, switch, create, and delete
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { readJson, writeJson, removeItem } from '../services/storage-service.js';
import { createEmptyLorebook, isPlaceholderLorebook } from '../services/entry-factory.js';
import { useSettingsStore }                from '../state/settings-store.js';
import { addToIndex, promoteInIndex } from '../services/lorebook-index.js';
import { LOREBOOK_KEY_PREFIX, LOREBOOK_INDEX_KEY } from '../constants/storage-keys.js';

export function useLorebook() {
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const lorebookIndex    = useLorebookStore((s) => s.lorebookIndex);
  const setActiveLorebookId = useLorebookStore((s) => s.setActiveLorebookId);
  const setLorebooks        = useLorebookStore((s) => s.setLorebooks);
  const setLorebookIndex    = useLorebookStore((s) => s.setLorebookIndex);
  const setLorebook         = useLorebookStore((s) => s.setLorebook);
  const removeLorebook      = useLorebookStore((s) => s.removeLorebook);
  const updateActiveName          = useLorebookStore((s) => s.updateActiveName);
  const renameLorebookByIdStore   = useLorebookStore((s) => s.renameLorebookById);
  const clearHistory              = useHistoryStore((s) => s.clear);
  const setPendingFocusLorebookName = useUiStore((s) => s.setPendingFocusLorebookName);
  const clearSelection              = useUiStore((s) => s.clearSelection);
  const setSearchQuery              = useUiStore((s) => s.setSearchQuery);
  const setSearchMode               = useUiStore((s) => s.setSearchMode);
  const setTypeFilter               = useUiStore((s) => s.setTypeFilter);

  const activeLorebook  = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;

  function createLorebook({ silent = false } = {}) {
    const rollbackDefaultEnabled = useSettingsStore.getState().rollbackDefaultEnabled;
    const lb = createEmptyLorebook(
      rollbackDefaultEnabled ? { rollback: { enabled: true, snapshotCount: 3 } } : {}
    );
    // From getState(), not the hook closure — same reason switchLorebook and
    // deleteLorebook do. Two creates in one tick (the tour loads two sample
    // books back to back) both read the closure's pre-chain index, so the second
    // addToIndex starts from an index that never had the first book in it and
    // writes it back out — silently dropping a lorebook that had just been
    // created and persisted. Found by the tour's reference step showing "no
    // lorebook is paired" with an empty candidate list.
    const newIndex = addToIndex(useLorebookStore.getState().lorebookIndex, lb);
    if (!newIndex) return; // full
    setLorebook(lb);
    setLorebookIndex(newIndex);
    setActiveLorebookId(lb.id);
    writeJson(LOREBOOK_KEY_PREFIX + lb.id, lb);
    writeJson(LOREBOOK_INDEX_KEY, newIndex);
    clearHistory();
    clearSelection();
    if (!silent) setPendingFocusLorebookName(true);
  }

  function switchLorebook(id) {
    // Read from getState() rather than the hook closure so this works even
    // when called as the tail of a chained mutation (e.g. deleteLorebook →
    // switchLorebook on the next-in-line book) — the closure would still
    // hold the pre-mutation index and re-add the just-deleted book via
    // promoteInIndex.
    const state = useLorebookStore.getState();
    if (id === state.activeLorebookId) return;
    if (!state.lorebooks[id]) {
      const lb = readJson(LOREBOOK_KEY_PREFIX + id);
      if (lb) setLorebook(lb);
    }
    const newIndex = promoteInIndex(state.lorebookIndex, id);
    setLorebookIndex(newIndex);
    setActiveLorebookId(id);
    writeJson(LOREBOOK_INDEX_KEY, newIndex);
    clearHistory();
    clearSelection();
    setSearchQuery('');
    setSearchMode('search');
    setTypeFilter([]);
  }

  function deleteLorebook(id) {
    removeItem(LOREBOOK_KEY_PREFIX + id);
    // removeLorebook (store action) updates both lorebooks and lorebookIndex
    // from the store's CURRENT state inside its set callback. We then read the
    // post-mutation values back via getState() — never via the hook closure —
    // because deleteLorebook can be called from a chain of synchronous store
    // mutations (e.g. importAsNewLorebook → createLorebook → … → deleteLorebook)
    // where the closure is captured pre-chain and is stale by this point.
    removeLorebook(id);
    const newIndex      = useLorebookStore.getState().lorebookIndex;
    const currentActive = useLorebookStore.getState().activeLorebookId;
    writeJson(LOREBOOK_INDEX_KEY, newIndex);

    if (id === currentActive) {
      const next = newIndex[0];
      if (next) {
        switchLorebook(next.id);
      } else {
        setActiveLorebookId(null);
        clearHistory();
        clearSelection();
      }
    }
  }

  function renameLorebook(name) {
    updateActiveName(name);
  }

  // Import-as-new: create a fresh lorebook, replace its (empty) entries with
  // the parsed import, optionally rename to the source name, and discard the
  // previously-active book if it was the bootstrap placeholder. Used by both
  // the Import tab's "Import as New Lorebook" choice and the Import Entries
  // popup's "Whole book from file" mode. Persists both the new lorebook and
  // the index synchronously so a quick tab-close doesn't lose the import
  // while autosave hasn't fired yet.
  function importAsNewLorebook({ entries: importedEntries, name }) {
    const oldActive    = activeLorebook;
    const discardOldId = isPlaceholderLorebook(oldActive) ? oldActive.id : null;

    createLorebook({ silent: name != null });
    const newActiveId = useLorebookStore.getState().activeLorebookId;
    if (newActiveId) {
      useLorebookStore.getState().updateActiveEntries(importedEntries);
      if (name != null) updateActiveName(name);
      const finalLb    = useLorebookStore.getState().lorebooks[newActiveId];
      const finalIndex = useLorebookStore.getState().lorebookIndex;
      writeJson(LOREBOOK_KEY_PREFIX + newActiveId, finalLb);
      writeJson(LOREBOOK_INDEX_KEY, finalIndex);
    }

    if (discardOldId && discardOldId !== newActiveId) {
      deleteLorebook(discardOldId);
    }
  }

  function renameLorebookById(id, name) {
    renameLorebookByIdStore(id, name);
    // Persist the lorebook itself (read from memory or storage for non-active lorebooks)
    const lb = lorebooks[id] ?? readJson(LOREBOOK_KEY_PREFIX + id);
    if (lb) writeJson(LOREBOOK_KEY_PREFIX + id, { ...lb, name });
    // Persist updated index
    const newIndex = lorebookIndex.map((item) =>
      item.id === id ? { ...item, name, updatedAt: Date.now() } : item
    );
    writeJson(LOREBOOK_INDEX_KEY, newIndex);
  }

  return {
    activeLorebookId,
    activeLorebook,
    lorebookIndex,
    createLorebook,
    switchLorebook,
    deleteLorebook,
    renameLorebook,
    renameLorebookById,
    importAsNewLorebook,
  };
}

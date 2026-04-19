// Active lorebook data and lorebook-level actions: load, switch, create, and delete
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { readJson, writeJson, removeItem } from '../services/storage-service.js';
import { createEmptyLorebook }             from '../services/entry-factory.js';
import { useSettingsStore }                from '../state/settings-store.js';
import { addToIndex, removeFromIndex, promoteInIndex } from '../services/lorebook-index.js';
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
  const updateActiveName          = useLorebookStore((s) => s.updateName);
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
    const newIndex = addToIndex(lorebookIndex, lb);
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
    if (id === activeLorebookId) return;
    // Load from storage if not in memory
    if (!lorebooks[id]) {
      const lb = readJson(LOREBOOK_KEY_PREFIX + id);
      if (lb) setLorebook(lb);
    }
    const newIndex = promoteInIndex(lorebookIndex, id);
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
    removeLorebook(id);
    const newIndex = removeFromIndex(lorebookIndex, id);
    setLorebookIndex(newIndex);
    writeJson(LOREBOOK_INDEX_KEY, newIndex);

    if (id === activeLorebookId) {
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
    updateActiveName(activeLorebookId, name);
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
  };
}

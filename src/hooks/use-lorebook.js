// Active lorebook data and lorebook-level actions: load, switch, create, and delete
import { useLorebookStore }  from '../state/lorebook-store.js';
import { useHistoryStore }   from '../state/history-store.js';
import { useUiStore }        from '../state/ui-store.js';
import { useSideLorebookId } from './use-side.js';
import { readJson, writeJson, removeItem } from '../services/storage-service.js';
import { createEmptyLorebook }             from '../services/entry-factory.js';
import { useSettingsStore }                from '../state/settings-store.js';
import { addToIndex, removeFromIndex, promoteInIndex } from '../services/lorebook-index.js';
import { LOREBOOK_KEY_PREFIX, LOREBOOK_INDEX_KEY } from '../constants/storage-keys.js';

export function useLorebook() {
  const sideId           = useSideLorebookId();
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const lorebookIndex    = useLorebookStore((s) => s.lorebookIndex);
  const setActiveLorebookId = useLorebookStore((s) => s.setActiveLorebookId);
  const setLorebooks        = useLorebookStore((s) => s.setLorebooks);
  const setLorebookIndex    = useLorebookStore((s) => s.setLorebookIndex);
  const setLorebook         = useLorebookStore((s) => s.setLorebook);
  const removeLorebook      = useLorebookStore((s) => s.removeLorebook);
  const updateActiveName    = useLorebookStore((s) => s.updateName);
  const renameLorebookByIdStore = useLorebookStore((s) => s.renameLorebookById);
  const clearHistoryFor         = useHistoryStore((s) => s.clearFor);
  const clearAllHistory         = useHistoryStore((s) => s.clear);
  const setPendingFocusLorebookName = useUiStore((s) => s.setPendingFocusLorebookName);
  const clearSelection              = useUiStore((s) => s.clearSelection);
  const setSearchQuery              = useUiStore((s) => s.setSearchQuery);
  const setSearchMode               = useUiStore((s) => s.setSearchMode);
  const setTypeFilter               = useUiStore((s) => s.setTypeFilter);

  // activeLorebook resolves to the side's lorebook when inside a SideContext.Provider,
  // or the focused-slot lorebook when called from outside (WindowHeader, menu panels, etc.)
  const activeLorebook = sideId ? lorebooks[sideId] ?? null : null;

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
    // New lorebook starts with no history — no clear needed.
    clearSelection();
    if (!silent) setPendingFocusLorebookName(true);
  }

  function switchLorebook(id) {
    if (id === activeLorebookId) return;
    if (!lorebooks[id]) {
      const lb = readJson(LOREBOOK_KEY_PREFIX + id);
      if (lb) setLorebook(lb);
    }
    const newIndex = promoteInIndex(lorebookIndex, id);
    setLorebookIndex(newIndex);
    setActiveLorebookId(id);
    writeJson(LOREBOOK_INDEX_KEY, newIndex);
    // Per-lorebook history means each lorebook retains its own undo stack across
    // switches — no clear needed. The incoming lorebook's history is already isolated.
    clearSelection();
    setSearchQuery('');
    setSearchMode('search');
    setTypeFilter([]);
  }

  function deleteLorebook(id) {
    removeItem(LOREBOOK_KEY_PREFIX + id);
    removeLorebook(id);
    clearHistoryFor(id);
    const newIndex = removeFromIndex(lorebookIndex, id);
    setLorebookIndex(newIndex);
    writeJson(LOREBOOK_INDEX_KEY, newIndex);

    // Snapshot slot state before we start mutating it, so the stale-side
    // cleanup below doesn't race with switchLorebook's setActiveLorebookId.
    const storeNow     = useLorebookStore.getState();
    const leftWasStale  = storeNow.leftId  === id;
    const rightWasStale = storeNow.rightId === id;
    const focusWas      = storeNow.focusSide;

    if (id === activeLorebookId) {
      const next = newIndex[0];
      if (next) {
        switchLorebook(next.id);
        // switchLorebook only fills the focused slot; clear a stale non-focused slot.
        if (focusWas === 'left'  && rightWasStale) useLorebookStore.getState().setSlot('right', null);
        if (focusWas === 'right' && leftWasStale)  useLorebookStore.getState().setSlot('left',  null);
      } else {
        setActiveLorebookId(null);
        clearAllHistory();
        clearSelection();
        if (leftWasStale)  useLorebookStore.getState().setSlot('left',  null);
        if (rightWasStale) useLorebookStore.getState().setSlot('right', null);
      }
    } else {
      // Deleted lorebook was in the non-focused slot — just null it out so the
      // side renders empty and the picker shows "(none)".
      if (leftWasStale)  useLorebookStore.getState().setSlot('left',  null);
      if (rightWasStale) useLorebookStore.getState().setSlot('right', null);
    }
  }

  function renameLorebook(name) {
    updateActiveName(sideId, name);
  }

  function renameLorebookById(id, name) {
    renameLorebookByIdStore(id, name);
    const lb = lorebooks[id] ?? readJson(LOREBOOK_KEY_PREFIX + id);
    if (lb) writeJson(LOREBOOK_KEY_PREFIX + id, { ...lb, name });
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

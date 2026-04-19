// Entry CRUD operations: add, update, remove, reorder, clearAll, and renumber enum badges
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { createEmptyEntry } from '../services/entry-factory.js';

export function useEntries() {
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const updateEntries    = useLorebookStore((s) => s.updateEntries);
  const storeUpdateEntry = useLorebookStore((s) => s.updateEntry);
  const pushSnapshot     = useHistoryStore((s) => s.pushSnapshot);

  const targetId = activeLorebookId;
  const targetLorebook = targetId ? lorebooks[targetId] ?? null : null;
  const entries = targetLorebook?.entries ?? [];

  function snapshot() {
    if (targetId) pushSnapshot(targetId, { entries: [...entries] });
  }

  function addEntry() {
    snapshot();
    const newEntry = createEmptyEntry();
    updateEntries(targetId, [...entries, newEntry]);
    useUiStore.getState().setPendingFocusEntryId(newEntry.id);
  }

  function updateEntry(id, patch, discrete = false) {
    if (discrete) snapshot();
    storeUpdateEntry(targetId, id, patch);
  }

  function removeEntry(id) {
    snapshot();
    updateEntries(targetId, entries.filter((e) => e.id !== id));
  }

  function reorderEntries(fromIdx, toIdx) {
    snapshot();
    const next = [...entries];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updateEntries(targetId, next);
  }

  function replaceEntries(newEntries) {
    snapshot();
    updateEntries(targetId, newEntries);
  }

  function clearAllEntries() {
    snapshot();
    updateEntries(targetId, []);
  }

  return { entries, addEntry, updateEntry, removeEntry, reorderEntries, replaceEntries, clearAllEntries };
}

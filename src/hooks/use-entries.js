// Entry CRUD operations: add, update, remove, reorder, clearAll, and renumber enum badges
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore } from '../state/history-store.js';
import { createEmptyEntry } from '../services/entry-factory.js';

export function useEntries() {
  const lorebooks           = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId    = useLorebookStore((s) => s.activeLorebookId);
  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const storeUpdateEntry    = useLorebookStore((s) => s.updateEntry);
  const pushSnapshot        = useHistoryStore((s) => s.pushSnapshot);

  const activeLorebook = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  const entries = activeLorebook?.entries ?? [];

  function snapshot() {
    pushSnapshot({ entries: [...entries] });
  }

  function addEntry() {
    snapshot();
    updateActiveEntries([...entries, createEmptyEntry()]);
  }

  function updateEntry(id, patch) {
    storeUpdateEntry(id, patch);
  }

  function removeEntry(id) {
    snapshot();
    updateActiveEntries(entries.filter((e) => e.id !== id));
  }

  function reorderEntries(fromIdx, toIdx) {
    snapshot();
    const next = [...entries];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updateActiveEntries(next);
  }

  function replaceEntries(newEntries) {
    snapshot();
    updateActiveEntries(newEntries);
  }

  function clearAllEntries() {
    snapshot();
    updateActiveEntries([]);
  }

  return { entries, addEntry, updateEntry, removeEntry, reorderEntries, replaceEntries, clearAllEntries };
}

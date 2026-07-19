// Entry CRUD operations: add, update, remove, reorder, clearAll, and renumber enum badges
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
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
    const newEntry = createEmptyEntry();
    updateActiveEntries([...entries, newEntry]);
    useUiStore.getState().setPendingFocusEntryId(newEntry.id);
  }

  function updateEntry(id, patch, discrete = false) {
    if (discrete) snapshot();
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

  // Bulk CharSnap visibility: force every entry public in one snapshot. Flips
  // any private (false) entry AND normalizes legacy entries that predate the
  // isPublic field (undefined) to an explicit true. Skips (no snapshot) only
  // when every entry is already explicitly public, so it never pushes an empty
  // undo step but always acts when there is anything to change.
  function makeAllPublic() {
    if (entries.every((e) => e.isPublic === true)) return;
    snapshot();
    updateActiveEntries(entries.map((e) => (e.isPublic === true ? e : { ...e, isPublic: true })));
  }

  return { entries, addEntry, updateEntry, removeEntry, reorderEntries, replaceEntries, clearAllEntries, makeAllPublic };
}

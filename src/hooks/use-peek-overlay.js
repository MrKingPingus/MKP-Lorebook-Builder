// Mobile reference-entry peek overlay. Resolves the peek id to the entry
// object from the paired reference lorebook and exposes the two footer
// actions: copy the entry into the active book, or visit it (swap roles +
// open the entry detail panel for the now-active entry).
import { useLorebookStore }     from '../state/lorebook-store.js';
import { useHistoryStore }      from '../state/history-store.js';
import { useUiStore }           from '../state/ui-store.js';
import { cloneEntry }           from '../services/entry-factory.js';
import { useReferenceLorebook } from './use-reference-lorebook.js';
import { useEntryDetail }       from './use-entry-detail.js';

export function usePeekOverlay() {
  const peekReferenceEntryId    = useUiStore((s) => s.peekReferenceEntryId);
  const setPeekReferenceEntryId = useUiStore((s) => s.setPeekReferenceEntryId);
  const lorebooks               = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId        = useLorebookStore((s) => s.activeLorebookId);
  const setLorebook             = useLorebookStore((s) => s.setLorebook);
  const pushSnapshot            = useHistoryStore((s) => s.pushSnapshot);
  const { referenceLorebook, swapReference } = useReferenceLorebook();
  const { openEntry }           = useEntryDetail();

  const peekEntry = peekReferenceEntryId && referenceLorebook
    ? referenceLorebook.entries.find((e) => e.id === peekReferenceEntryId) ?? null
    : null;

  function closePeek() {
    setPeekReferenceEntryId(null);
  }

  function copyToActive() {
    if (!peekEntry || !activeLorebookId) return;
    const activeLorebook = lorebooks[activeLorebookId];
    if (!activeLorebook) return;
    const destEntries = activeLorebook.entries ?? [];
    const clone       = cloneEntry(peekEntry);
    pushSnapshot({ entries: [...destEntries] });
    setLorebook({ ...activeLorebook, entries: [...destEntries, clone] });
    closePeek();
  }

  // Swap roles so the peeked entry's lorebook becomes active, then open it
  // in the mobile detail panel. Closing the peek happens last so the swap
  // doesn't briefly leave a stale peek pointing at the now-active book.
  function visitEntry() {
    if (!peekEntry) return;
    const id = peekEntry.id;
    swapReference();
    openEntry(id);
    closePeek();
  }

  return { peekEntry, closePeek, copyToActive, visitEntry };
}

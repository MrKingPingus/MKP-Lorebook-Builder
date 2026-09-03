// Mobile single-entry push: copy one entry from the active book into the
// paired reference book. Mirrors `copyToActive` in use-peek-overlay.js for
// the opposite direction. Like `copyToOtherPanel` in use-bulk-actions.js,
// no history snapshot is taken when the destination is the reference book —
// the history store is active-only, and cross-book undo isn't supported.
import { useLorebookStore } from '../state/lorebook-store.js';
import { cloneEntry }      from '../services/entry-factory.js';
import { saveLorebook }    from '../services/storage-service.js';

export function useCopyEntryToReference() {
  const lorebooks           = useLorebookStore((s) => s.lorebooks);
  const referenceLorebookId = useLorebookStore((s) => s.referenceLorebookId);
  const setLorebook         = useLorebookStore((s) => s.setLorebook);

  function copyEntryToReference(entry) {
    if (!entry || !referenceLorebookId) return false;
    const referenceLorebook = lorebooks[referenceLorebookId];
    if (!referenceLorebook) return false;
    const destEntries = referenceLorebook.entries ?? [];
    const clone       = cloneEntry(entry);
    const nextRef     = { ...referenceLorebook, entries: [...destEntries, clone] };
    setLorebook(nextRef);
    // Autosave only ever persists the ACTIVE book, so a push to the reference
    // book has to write itself through — otherwise it lives in memory until the
    // user happens to switch to that book, and is gone if they close the tab
    // first. Same reason `copyToOtherPanel` in use-bulk-actions.js does.
    saveLorebook(nextRef);
    return true;
  }

  return { copyEntryToReference };
}

// Mobile-only "Pick from Reference" pose. Multi-select cross-book pull
// without a parallel selection UI: enter the pose, the reference book
// gets swapped into the active slot so the existing Select mode operates
// against it unchanged, the user picks entries, then commit copies the
// selection from current-active (originally reference) to current-
// reference (originally active) and reverses the swap.
//
// Only the entry/exit choreography is new. Selection, the bulk action
// bar, and copyToOtherPanel all already operate on whichever lorebook is
// currently active — they don't care that "active" is the original
// reference during the pose.
import { useUiStore }              from '../state/ui-store.js';
import { useReferenceLorebook }    from './use-reference-lorebook.js';
import { useBulkActions }          from './use-bulk-actions.js';

export function usePickFromReference() {
  const pickFromReferenceMode    = useUiStore((s) => s.pickFromReferenceMode);
  const setPickFromReferenceMode = useUiStore((s) => s.setPickFromReferenceMode);
  const setSearchMode            = useUiStore((s) => s.setSearchMode);
  const clearSelection           = useUiStore((s) => s.clearSelection);
  const { swapReference }        = useReferenceLorebook();
  const { copyToOtherPanel }     = useBulkActions();

  function enterPickFromReference() {
    if (pickFromReferenceMode) return;
    swapReference();              // swap clears selection internally
    setSearchMode('select');
    setPickFromReferenceMode(true);
  }

  // commit=true → copy selected entries from current-active (originally
  // reference) to current-reference (originally active), then swap back.
  // commit=false → cancel: just swap back and clean up.
  function exitPickFromReference(commit = false) {
    if (!pickFromReferenceMode) return;
    if (commit) copyToOtherPanel(); // clears selection; the explicit setSearchMode below exits select mode
    swapReference();                // swap back; clears selection again
    clearSelection();
    setSearchMode('search');
    setPickFromReferenceMode(false);
  }

  return {
    pickFromReferenceMode,
    enterPickFromReference,
    exitPickFromReference,
  };
}

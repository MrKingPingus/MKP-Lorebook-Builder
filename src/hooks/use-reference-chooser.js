// State and actions for the reference chooser — the one place a lorebook gets
// paired as the reference, wherever it was opened from.
//
// Three doors, one room: the mobile title menu's footer button, the hotbar's
// Reference action (both platforms), and the Lorebooks panel button on desktop.
// They all flip the same `referenceChooserOpen` flag rather than each growing
// their own picker, which is how the old surface ended up with a `<select>` in
// one panel and a toggle in another that knew nothing about each other.
import { useUiStore }           from '../state/ui-store.js';
import { useSettings }          from './use-settings.js';
import { useSortedLorebooks }   from './use-sorted-lorebooks.js';
import { useReferenceLorebook } from './use-reference-lorebook.js';

export function useReferenceChooser() {
  const open     = useUiStore((s) => s.referenceChooserOpen);
  const setOpen  = useUiStore((s) => s.setReferenceChooserOpen);
  const setReferenceBrowseOpen = useUiStore((s) => s.setReferenceBrowseOpen);
  const { lorebookSort } = useSettings();
  const { referenceLorebook, crosstalkEnabled, setReferenceLorebookId } = useReferenceLorebook();

  // Same snapshot-on-open ordering as every other list of books, so the
  // chooser agrees with the title menu about what order the books are in.
  const { sorted } = useSortedLorebooks({ mode: lorebookSort, open });

  // Everything except the book you are editing and the one already paired.
  // Pairing a book with itself is the one combination that means nothing.
  const candidates = sorted.filter(
    (item) => !item.isActive && item.id !== referenceLorebook?.id,
  );

  function pair(id) {
    setReferenceLorebookId(id);
    setOpen(false);
  }

  function unpair() {
    setReferenceLorebookId(null);
    setOpen(false);
  }

  // Browse is a mobile affordance (ReferenceBrowseSheet); on desktop the
  // reference pane is already on screen, so there is nothing to open.
  function browse() {
    setOpen(false);
    setReferenceBrowseOpen(true);
  }

  return {
    open,
    openChooser:  () => setOpen(true),
    closeChooser: () => setOpen(false),
    referenceLorebook,
    isPaired: crosstalkEnabled,
    candidates,
    pair,
    unpair,
    browse,
  };
}

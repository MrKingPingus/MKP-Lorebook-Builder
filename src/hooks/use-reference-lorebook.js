// Reference lorebook (read-only side of crosstalk): resolves the id to the
// lorebook object, and exposes the setter, swap, and clear actions plus the
// `crosstalkEnabled` flag that gates the reference panel and the per-book
// find/replace UI. Selection is active-only — clear it on swap so the new
// active side doesn't inherit selected ids that belong to a different lorebook.
//
// **`crosstalkEnabled` is derived, not stored** (mobile overhaul decision 9).
// A book is paired or it is not; there is no separate switch anywhere in the
// app. It used to be a setting, and the split is exactly what GitHub #123 was:
// the toggle lived in Settings and the picker lived in a panel mobile had no
// route to, so turning the feature "on" produced no visible change whatsoever
// and there was nothing to tell the user what they were still missing. A toggle
// whose effect is invisible until a second, hidden control is also set is worse
// than no toggle, so this is the one that went.
//
// Migration is a no-op in practice: `setCrosstalkEnabled(false)` always nulled
// the reference id, so nobody has a stored pairing with the old flag off. The
// reverse state — flag on, nothing paired — used to render an empty reference
// pane, and now renders nothing until a book is chosen.
import { useLorebookStore } from '../state/lorebook-store.js';
import { useUiStore }       from '../state/ui-store.js';

export function useReferenceLorebook() {
  const referenceLorebookId    = useLorebookStore((s) => s.referenceLorebookId);
  const lorebooks              = useLorebookStore((s) => s.lorebooks);
  const setReferenceLorebookId = useLorebookStore((s) => s.setReferenceLorebookId);
  const swapReferenceStore     = useLorebookStore((s) => s.swapReference);
  const clearSelection         = useUiStore((s) => s.clearSelection);
  const toggleActiveSide       = useUiStore((s) => s.toggleActiveSide);

  const referenceLorebook = referenceLorebookId
    ? lorebooks[referenceLorebookId] ?? null
    : null;

  // Derived from the pairing, and resolved through `lorebooks` rather than the
  // raw id — a reference id left pointing at a deleted book is not crosstalk.
  const crosstalkEnabled = !!referenceLorebook;

  // Flip active/reference ids AND the physical side flag together so the
  // panel the user clicked stays in the same slot — only its role changes.
  function swapReference() {
    swapReferenceStore();
    toggleActiveSide();
    clearSelection();
  }

  function clearReference() {
    setReferenceLorebookId(null);
  }

  return {
    crosstalkEnabled,
    referenceLorebook,
    setReferenceLorebookId,
    swapReference,
    clearReference,
  };
}

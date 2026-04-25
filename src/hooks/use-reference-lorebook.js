// Reference lorebook (read-only side of crosstalk): resolves the id to the
// lorebook object, and exposes the setter, swap, and clear actions plus the
// `crosstalkEnabled` feature flag (single source of truth for whether the
// reference panel and per-book find/replace UI render). Selection is
// active-only — clear it on swap so the new active side doesn't inherit
// selected ids that belong to a different lorebook.
import { useLorebookStore } from '../state/lorebook-store.js';
import { useSettingsStore } from '../state/settings-store.js';
import { useUiStore }       from '../state/ui-store.js';

export function useReferenceLorebook() {
  const crosstalkEnabled       = useSettingsStore((s) => s.crosstalkEnabled);
  const referenceLorebookId    = useLorebookStore((s) => s.referenceLorebookId);
  const lorebooks              = useLorebookStore((s) => s.lorebooks);
  const setReferenceLorebookId = useLorebookStore((s) => s.setReferenceLorebookId);
  const swapReferenceStore     = useLorebookStore((s) => s.swapReference);
  const clearSelection         = useUiStore((s) => s.clearSelection);
  const toggleActiveSide       = useUiStore((s) => s.toggleActiveSide);

  const referenceLorebook = referenceLorebookId
    ? lorebooks[referenceLorebookId] ?? null
    : null;

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

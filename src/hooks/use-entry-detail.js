// Mobile entry detail panel — open/close the full-screen entry editor by entry id
import { useUiStore } from '../state/ui-store.js';

export function useEntryDetail() {
  const activeEntryId    = useUiStore((s) => s.activeEntryId);
  const setActiveEntryId = useUiStore((s) => s.setActiveEntryId);

  return {
    activeEntryId,
    openEntry:  (id) => setActiveEntryId(id),
    closeEntry: ()   => setActiveEntryId(null),
  };
}

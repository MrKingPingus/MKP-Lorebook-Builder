// Crosstalk slot management: read leftId/rightId/focusSide and swap slots with
// filter reset. Centralizes the side-effect of clearing shared UI state
// (search, type filter, selection) that would otherwise hide entries on the
// newly-picked lorebook.
import { useLorebookStore } from '../state/lorebook-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { readJson }         from '../services/storage-service.js';
import { LOREBOOK_KEY_PREFIX } from '../constants/storage-keys.js';

export function useCrosstalkSlots() {
  const leftId        = useLorebookStore((s) => s.leftId);
  const rightId       = useLorebookStore((s) => s.rightId);
  const focusSide     = useLorebookStore((s) => s.focusSide);
  const lorebooks     = useLorebookStore((s) => s.lorebooks);
  const lorebookIndex = useLorebookStore((s) => s.lorebookIndex);
  const setSlotStore  = useLorebookStore((s) => s.setSlot);
  const setLorebook   = useLorebookStore((s) => s.setLorebook);
  const setFocusSide  = useLorebookStore((s) => s.setFocusSide);

  const leftName  = leftId  ? lorebooks[leftId]?.name  ?? '' : '';
  const rightName = rightId ? lorebooks[rightId]?.name ?? '' : '';

  function pickSlot(side, id) {
    if (id && !lorebooks[id]) {
      const lb = readJson(LOREBOOK_KEY_PREFIX + id);
      if (lb) setLorebook(lb);
    }
    setSlotStore(side, id);
    const ui = useUiStore.getState();
    ui.setSearchQuery('');
    ui.setSearchMode('search');
    ui.setTypeFilter([]);
    ui.clearSelection();
  }

  return {
    leftId, rightId, focusSide,
    leftName, rightName,
    lorebookIndex,
    setSlot:      setSlotStore, // raw — used by auto-seed effect only
    pickSlot,                   // wrapped — use from UI handlers
    setFocusSide,
  };
}

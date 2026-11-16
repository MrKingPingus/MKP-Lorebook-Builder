// Desktop: records which build-pane entry card was most recently worked in, as
// `lastFocusedEntryId`. Desktop can have several cards open at once, so "the
// entry you're editing" has to mean the one you last touched — that is what
// Keep in view's Highlight Differences compares against until you pick one.
// Mobile has one open entry at a time (activeEntryId) and needs none of this.
//
// Listens for pointerdown as well as focusin: Safari does not focus a button
// on click, so clicking an entry's Expand would otherwise go unrecorded.
//
// The kept entry is never recorded. Editing it in the list should not make it
// its own comparison and lose the one it had.
import { useEffect } from 'react';
import { useUiStore } from '../state/ui-store.js';
import { useMobile }  from './use-mobile.js';

const CARD_ID_PREFIX = 'entry-';

export function useLastFocusedEntry() {
  const isMobile = useMobile();

  useEffect(() => {
    if (isMobile) return undefined;
    function record(e) {
      const card = e.target instanceof Element ? e.target.closest('.build-panel .entry-card') : null;
      if (!card || !card.id.startsWith(CARD_ID_PREFIX)) return;
      const id = card.id.slice(CARD_ID_PREFIX.length);
      const { lastFocusedEntryId, keptEntry, setLastFocusedEntryId } = useUiStore.getState();
      if (id === lastFocusedEntryId || id === keptEntry?.entryId) return;
      setLastFocusedEntryId(id);
    }
    document.addEventListener('focusin', record);
    document.addEventListener('pointerdown', record);
    return () => {
      document.removeEventListener('focusin', record);
      document.removeEventListener('pointerdown', record);
    };
  }, [isMobile]);
}

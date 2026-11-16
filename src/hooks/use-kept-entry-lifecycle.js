// Clears "Keep in view" when the kept entry stops existing where it was kept:
// the active book changed (switching books, or a crosstalk role swap) or the
// entry was deleted or moved out. Mounted once, in FloatingWindow.
//
// Clearing rather than hiding: a kept entry that came back by itself after an
// undo or a swap back would be state the user had stopped thinking about.
import { useEffect } from 'react';
import { useUiStore }       from '../state/ui-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';

export function useKeptEntryLifecycle() {
  const kept             = useUiStore((s) => s.keptEntry);
  const clearKeptEntry   = useUiStore((s) => s.clearKeptEntry);
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);

  useEffect(() => {
    if (!kept) return;
    const stillThere = kept.lorebookId === activeLorebookId
      && !!lorebooks[activeLorebookId]?.entries.some((e) => e.id === kept.entryId);
    if (!stillThere) clearKeptEntry();
  }, [kept, lorebooks, activeLorebookId, clearKeptEntry]);
}

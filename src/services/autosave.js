// Debounced autosave orchestrator — subscribes to lorebook store and calls storage-service on change
import { useLorebookStore } from '../state/lorebook-store.js';
import { useUiStore } from '../state/ui-store.js';
import { saveLorebook, saveLorebookIndex } from './storage-service.js';

const DEBOUNCE_MS = 800;

/**
 * Mount the autosave service. Returns an unsubscribe function.
 * Call this once on app mount; call the returned fn on unmount.
 */
export function mountAutosave() {
  let timer = null;

  const save = (state) => {
    const { activeLorebookId, lorebooks, lorebookIndex } = state;
    if (!activeLorebookId) return;

    const lorebook = lorebooks[activeLorebookId];
    if (!lorebook) return;

    // Both of these no-op for the tour's ephemeral samples, which is the point:
    // autosave is the one write site a caller cannot opt out of, since it fires
    // on every store change rather than at a call site anyone chose.
    saveLorebook(lorebook);
    saveLorebookIndex(lorebookIndex);
    if (!lorebook.ephemeral) useUiStore.getState().setSavedAt(Date.now());
  };

  const unsubscribe = useLorebookStore.subscribe((state) => {
    clearTimeout(timer);
    timer = setTimeout(() => save(state), DEBOUNCE_MS);
  });

  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

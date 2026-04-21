// Debounced autosave orchestrator — subscribes to lorebook store and calls storage-service on change
import { useLorebookStore } from '../state/lorebook-store.js';
import { useUiStore } from '../state/ui-store.js';
import { writeJson } from './storage-service.js';
import { LOREBOOK_KEY_PREFIX, LOREBOOK_INDEX_KEY } from '../constants/storage-keys.js';

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

    writeJson(LOREBOOK_KEY_PREFIX + activeLorebookId, lorebook);
    writeJson(LOREBOOK_INDEX_KEY, lorebookIndex);
    useUiStore.getState().setSavedAt(Date.now());
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

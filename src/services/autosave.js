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

  // Saves every lorebook currently occupying a slot (leftId and rightId).
  // Single-lorebook mode: rightId is null, so only the active slot is written.
  // Crosstalk mode: both sides are written regardless of focus, so edits on
  // the non-focused side survive — previously they were lost because the
  // save only looked at activeLorebookId.
  const save = (state) => {
    const { leftId, rightId, lorebooks, lorebookIndex } = state;
    const ids = [leftId, rightId].filter((id, i, arr) => id && arr.indexOf(id) === i);
    if (ids.length === 0) return;

    let wrote = false;
    for (const id of ids) {
      const lb = lorebooks[id];
      if (lb) {
        writeJson(LOREBOOK_KEY_PREFIX + id, lb);
        wrote = true;
      }
    }
    writeJson(LOREBOOK_INDEX_KEY, lorebookIndex);
    if (wrote) useUiStore.getState().setSavedAt(Date.now());
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

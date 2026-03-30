// Resolves hotbar slot IDs from settings into callable action objects
// Uses a lookup table so adding registry entries never requires structural changes here
import { useUndoRedo }      from './use-undo-redo.js';
import { useEntries }       from './use-entries.js';
import { useUi }            from './use-ui.js';
import { useSettings }      from './use-settings.js';
import { HOTBAR_ACTION_MAP } from '../constants/hotbar-actions.js';

// Each resolver receives shared hook outputs and returns { execute, disabled }
const RESOLVERS = {
  undo: ({ undo, canUndo }) => ({
    execute:  undo,
    disabled: !canUndo,
  }),
  redo: ({ redo, canRedo }) => ({
    execute:  redo,
    disabled: !canRedo,
  }),
  clear_entries: ({ clearAllEntries }) => ({
    execute:  clearAllEntries,
    disabled: false,
  }),
  append_import: ({ setShowAppendImport }) => ({
    execute:  () => setShowAppendImport(true),
    disabled: false,
  }),
};

export function useHotbarActions() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const { addEntry, clearAllEntries }    = useEntries();
  const setShowAppendImport              = useUi((s) => s.setShowAppendImport);
  const { hotbarSlots }                  = useSettings();

  const context = { undo, redo, canUndo, canRedo, clearAllEntries, setShowAppendImport };

  const slots = hotbarSlots.map((id) => {
    if (!id) return null;

    const descriptor = HOTBAR_ACTION_MAP[id];
    if (!descriptor) {
      if (import.meta.env.DEV) {
        console.warn(`[use-hotbar-actions] slot id "${id}" has no descriptor in HOTBAR_ACTION_MAP`);
      }
      return null;
    }

    const resolver = RESOLVERS[id];
    if (!resolver) {
      if (import.meta.env.DEV) {
        console.warn(`[use-hotbar-actions] slot id "${id}" has no resolver — add one to RESOLVERS`);
      }
      return null;
    }

    return { descriptor, ...resolver(context) };
  });

  return { slots, addEntry };
}

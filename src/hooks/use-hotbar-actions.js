// Resolves hotbar slot IDs from settings into callable action objects
// Uses a lookup table so adding registry entries never requires structural changes here
import { useUndoRedo }      from './use-undo-redo.js';
import { useEntries }       from './use-entries.js';
import { useUi }            from './use-ui.js';
import { useSettings }      from './use-settings.js';
import { useReferenceLorebook } from './use-reference-lorebook.js';
import { HOTBAR_ACTIONS, HOTBAR_ACTION_MAP } from '../constants/hotbar-actions.js';

// Each resolver receives shared hook outputs and returns { execute, disabled }
// — plus an optional `active: boolean` for stateful toggles (e.g. crosstalk)
// so the slot can render an "on" treatment instead of a flat command button.
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
  make_all_public: ({ makeAllPublic }) => ({
    execute:  makeAllPublic,
    disabled: false,
  }),
  make_all_private: ({ makeAllPrivate }) => ({
    execute:  makeAllPrivate,
    disabled: false,
  }),
  make_export: ({ openExportMenu }) => ({
    // Anchor the floating export menu above whichever button was clicked.
    execute: (e) => {
      const el = e && e.currentTarget;
      const r  = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      openExportMenu(r ? { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width } : null);
    },
    disabled: false,
  }),
  append_import: ({ setShowAppendImport }) => ({
    execute:  () => setShowAppendImport(true),
    disabled: false,
  }),
  // Opens the chooser instead of flipping a flag. The old version turned
  // crosstalk on and left the user to find the picker in a panel it had just
  // opened — which is the trap #123 fell into. `active` means a book is
  // actually paired, not that a mode is nominally on.
  toggle_crosstalk: ({ openReferenceChooser, crosstalkEnabled }) => ({
    execute:  () => openReferenceChooser(),
    disabled: false,
    active:   crosstalkEnabled,
  }),
};

export function useHotbarActions() {
  const { undo, redo, canUndo, canRedo }            = useUndoRedo();
  const { addEntry, clearAllEntries, makeAllPublic, makeAllPrivate } = useEntries();
  const setShowAppendImport                         = useUi((s) => s.setShowAppendImport);
  const openExportMenu                              = useUi((s) => s.openExportMenu);
  const setReferenceChooserOpen                     = useUi((s) => s.setReferenceChooserOpen);
  const { hotbarSlots }        = useSettings();
  const { crosstalkEnabled }   = useReferenceLorebook();

  const context = {
    undo, redo, canUndo, canRedo,
    clearAllEntries, makeAllPublic, makeAllPrivate,
    setShowAppendImport, openExportMenu,
    crosstalkEnabled,
    openReferenceChooser: () => setReferenceChooserOpen(true),
  };

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

  // Quick-menu surface: every known hotbar action resolved against the same
  // context, regardless of the user's slot configuration. Lets the FAB hover /
  // long-press menu act as an action-discovery affordance independent of the
  // hotbar layout.
  const allActions = HOTBAR_ACTIONS.map(({ id }) => {
    const descriptor = HOTBAR_ACTION_MAP[id];
    const resolver   = RESOLVERS[id];
    if (!descriptor || !resolver) return null;
    return { descriptor, ...resolver(context) };
  }).filter(Boolean);

  return { slots, addEntry, allActions };
}

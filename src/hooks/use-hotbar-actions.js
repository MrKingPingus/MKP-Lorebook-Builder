// Resolves hotbar slot IDs from settings into callable action objects
// Uses a lookup table so adding registry entries never requires structural changes here
import { useUndoRedo }      from './use-undo-redo.js';
import { useEntries }       from './use-entries.js';
import { useUi }            from './use-ui.js';
import { useSettings }      from './use-settings.js';
import { useReferenceLorebook } from './use-reference-lorebook.js';
import { useHostStore }     from '../state/host-store.js';
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
  save_to_host: ({ saveToHost, hostLoaded, hostSaving }) => ({
    execute:  () => saveToHost?.(),
    disabled: !hostLoaded || hostSaving || !saveToHost,
  }),
};

// In host mode the Save action takes the first empty slot unless the user has
// already placed it. Display-only — the persisted slot array is untouched, so
// the standalone hotbar is exactly what the user configured.
function slotsForHost(slots) {
  if (slots.includes('save_to_host')) return slots;
  const empty = slots.indexOf(null);
  if (empty === -1) return slots;
  const next = [...slots];
  next[empty] = 'save_to_host';
  return next;
}

export function useHotbarActions() {
  const { undo, redo, canUndo, canRedo }            = useUndoRedo();
  const { addEntry, clearAllEntries, makeAllPublic, makeAllPrivate } = useEntries();
  const setShowAppendImport                         = useUi((s) => s.setShowAppendImport);
  const openExportMenu                              = useUi((s) => s.openExportMenu);
  const setReferenceChooserOpen                     = useUi((s) => s.setReferenceChooserOpen);
  const { hotbarSlots }        = useSettings();
  const { crosstalkEnabled }   = useReferenceLorebook();
  const hostMode               = useHostStore((s) => s.enabled);
  const hostLoaded             = useHostStore((s) => s.loaded);
  const hostSaving             = useHostStore((s) => s.saving);
  const saveToHost             = useHostStore((s) => s.saveToHost);

  const context = {
    undo, redo, canUndo, canRedo,
    clearAllEntries, makeAllPublic, makeAllPrivate,
    setShowAppendImport, openExportMenu,
    crosstalkEnabled,
    openReferenceChooser: () => setReferenceChooserOpen(true),
    saveToHost, hostLoaded, hostSaving,
  };

  const effectiveSlots = hostMode ? slotsForHost(hotbarSlots) : hotbarSlots;

  const slots = effectiveSlots.map((id) => {
    if (!id) return null;

    const descriptor = HOTBAR_ACTION_MAP[id];
    // A host-only action in a persisted slot reads as empty outside host mode.
    if (descriptor?.hostOnly && !hostMode) return null;
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
    if (descriptor.hostOnly && !hostMode) return null;
    return { descriptor, ...resolver(context) };
  }).filter(Boolean);

  return { slots, addEntry, allActions };
}

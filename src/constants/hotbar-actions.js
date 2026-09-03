// Static action registry — pure descriptors with no execution logic
// execute() is resolved at the hook layer (use-hotbar-actions.js)

export const HOTBAR_ACTIONS = [
  {
    id:      'undo',
    label:   'Undo',
    icon:    '↩',
    title:   'Undo',
  },
  {
    id:      'redo',
    label:   'Redo',
    icon:    '↪',
    title:   'Redo',
  },
  {
    id:      'clear_entries',
    label:   'Clear All',
    icon:    '✕',
    title:   'Clear all entries',
    confirm: 'Clear all entries? This can be undone.',
  },
  {
    id:      'make_all_public',
    label:   'All Public',
    icon:    '◉',
    title:   'Make all entries public on CharSnap (undoable)',
  },
  {
    id:      'make_all_private',
    label:   'All Private',
    icon:    '○',
    title:   'Make all entries private on CharSnap (undoable)',
  },
  {
    id:      'make_export',
    label:   'Export',
    icon:    '⬆',
    title:   'Export the book (pick format + filename)',
  },
  {
    id:      'append_import',
    label:   'Import',
    icon:    '⬇',
    title:   'Append entries from file or text',
  },
  {
    // Opens the reference chooser rather than flipping a mode. The id is kept
    // because it is persisted in every user's `hotbarSlots` array.
    id:      'toggle_crosstalk',
    label:   'Reference',
    icon:    '⇆',
    title:   'Pair a reference lorebook',
  },
  {
    // Host mode only: the explicit write to CharSnap. `hostOnly` keeps it out
    // of the standalone hotbar, Settings slot picker and quick menu.
    id:       'save_to_host',
    label:    'Save',
    icon:     '☁',
    title:    'Save to CharSnap',
    hostOnly: true,
  },
];

// Keyed map for O(1) lookup in use-hotbar-actions.js
export const HOTBAR_ACTION_MAP = Object.fromEntries(
  HOTBAR_ACTIONS.map((a) => [a.id, a])
);

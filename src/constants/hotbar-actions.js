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
    label:   'Import Entries',
    icon:    '↓',
    title:   'Append entries from file or text',
  },
  {
    id:      'toggle_crosstalk',
    label:   'Reference',
    icon:    '⇆',
    title:   'Show/hide reference panel',
  },
];

// Keyed map for O(1) lookup in use-hotbar-actions.js
export const HOTBAR_ACTION_MAP = Object.fromEntries(
  HOTBAR_ACTIONS.map((a) => [a.id, a])
);

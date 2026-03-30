// Static action registry — pure descriptors with no execution logic
// execute() is resolved at the hook layer (use-hotbar-actions.js)

export const HOTBAR_ACTIONS = [
  {
    id:      'undo',
    label:   'Undo',
    icon:    '↩',
    title:   'Undo (Ctrl+Z)',
  },
  {
    id:      'redo',
    label:   'Redo',
    icon:    '↪',
    title:   'Redo (Ctrl+Y)',
  },
  {
    id:      'clear_entries',
    label:   'Clear All',
    icon:    '✕',
    title:   'Clear all entries',
    confirm: 'Clear all entries? This can be undone.',
  },
  {
    id:      'append_import',
    label:   'Import Entries',
    icon:    '↓',
    title:   'Append entries from file or text',
  },
];

// Keyed map for O(1) lookup in use-hotbar-actions.js
export const HOTBAR_ACTION_MAP = Object.fromEntries(
  HOTBAR_ACTIONS.map((a) => [a.id, a])
);

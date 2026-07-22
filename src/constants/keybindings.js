// Static keybinding registry — pure descriptors, no execution logic.
// Effective chords are resolved at the hook layer (use-keybindings.js), which
// merges these defaults with the user's overrides from settings-store.
// Handlers are supplied by the component layer (App.jsx) keyed by `id`.
//
// Fields:
//   id            — stable action id (matches the handler map key + override map key)
//   label         — human label shown in Settings + the help overlay
//   category      — group id (see KEYBINDING_CATEGORIES)
//   defaultChord  — canonical chord string (see services/keychord.js for the grammar)
//   altChords     — extra chords that also fire the action while it is on its
//                   default binding (dropped once the user sets a custom chord)
//   wired         — true if a live handler ships this pass; false = reserved
//                   default, collision-checked but not yet dispatched
//   context       — optional gate id; the action only fires/enables in that context
//   allowInInput  — when true the binding still fires while a text field is focused
//   fixed         — true = not user-rebindable (shown in the overlay for reference only)

export const KEYBINDING_CATEGORIES = [
  { id: 'editing',   label: 'Editing' },
  { id: 'selection', label: 'Entries & selection' },
  { id: 'navigate',  label: 'Find & navigate' },
  { id: 'reference', label: 'Reference & crosstalk' },
  { id: 'io',        label: 'Import & export' },
  { id: 'app',       label: 'App' },
];

export const KEYBINDINGS = [
  // Editing
  { id: 'new_entry',           label: 'New entry',                category: 'editing',   defaultChord: 'Alt+N', wired: true },
  { id: 'undo',                label: 'Undo',                     category: 'editing',   defaultChord: 'Mod+Z', wired: true },
  { id: 'redo',                label: 'Redo',                     category: 'editing',   defaultChord: 'Mod+Y', altChords: ['Mod+Shift+Z'], wired: true },
  // Entries & selection
  { id: 'toggle_select',       label: 'Toggle select mode',       category: 'selection', defaultChord: 'Alt+S', wired: true },
  { id: 'expand_collapse_all', label: 'Expand / collapse all',    category: 'selection', defaultChord: 'Alt+A', wired: true },

  // Find & navigate
  { id: 'focus_search',        label: 'Focus search',             category: 'navigate',  defaultChord: '/',     wired: true },
  { id: 'focus_find_replace',  label: 'Focus find & replace',     category: 'navigate',  defaultChord: 'Alt+H', wired: true },

  // Reference & crosstalk
  { id: 'toggle_reference',    label: 'Toggle reference panel',   category: 'reference', defaultChord: 'Alt+R', wired: true },
  { id: 'swap_reference',      label: 'Swap reference ↔ active',  category: 'reference', defaultChord: 'Alt+W', wired: true, context: 'crosstalk' },

  // Import & export
  { id: 'export',              label: 'Export',                   category: 'io',        defaultChord: 'Alt+E', wired: true },
  { id: 'import_entries',      label: 'Import entries',           category: 'io',        defaultChord: 'Alt+I', wired: true },

  // App
  { id: 'open_settings',       label: 'Open settings',            category: 'app',       defaultChord: 'Mod+,', wired: true },
  { id: 'keyboard_help',       label: 'Keyboard shortcuts help',  category: 'app',       defaultChord: '?',     wired: true },
  { id: 'dismiss',             label: 'Dismiss / cancel',         category: 'app',       defaultChord: 'Escape', wired: true, fixed: true },
];

export const KEYBINDING_MAP = Object.fromEntries(KEYBINDINGS.map((k) => [k.id, k]));

// Legacy single-letter hotkey fields (pre-registry) mapped to their new action
// ids and the modifier they were hardwired to. Used by the one-time migration
// in services/keychord.js → migrateLegacyHotkeys().
export const LEGACY_HOTKEY_FIELDS = [
  { field: 'newEntryHotkey', id: 'new_entry', modifier: 'Alt', legacyDefault: 'n' },
  { field: 'undoHotkey',     id: 'undo',      modifier: 'Mod', legacyDefault: 'z' },
  { field: 'redoHotkey',     id: 'redo',      modifier: 'Mod', legacyDefault: 'y' },
];

// Chords the capture UI refuses to assign (browser / OS reserved). Bare
// single alphanumeric keys are refused separately (they would break typing);
// see services/keychord.js → isReservedChord().
export const RESERVED_CHORDS = [
  'Mod+T', 'Mod+N', 'Mod+W', 'Mod+Q', 'Mod+Tab', 'Mod+L', 'Mod+D', 'Mod+P',
  'Mod+Shift+T', 'Mod+Shift+N', 'Mod+Shift+W',
  'F5', 'F11', 'F12', 'Alt+F4', 'Meta+Tab',
];

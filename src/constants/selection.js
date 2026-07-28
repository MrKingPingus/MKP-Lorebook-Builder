// Modifier+click selection gestures.
//
// The scheme is uniformly additive/subtractive: shift adds, ctrl/cmd removes.
// That deliberately differs from the OS file-manager convention, where a plain
// click *replaces* the selection and so shift+click replacing-with-a-range is
// consistent. Here a plain click already toggles like a checkbox, so giving
// shift+click replace-semantics would make the one most-reachable gesture
// silently discard a selection the user had been building up.
export const SELECTION_ACTIONS = {
  ADD:    'add',     // add these ids to the selection
  REMOVE: 'remove',  // take these ids out of it
  NONE:   'none',    // not a macro click — let normal handling run
};

// Rendered in the keyboard help overlay. Kept beside the semantics they
// describe so the two can't drift apart.
export const SELECTION_GESTURES = [
  { id: 'shift-click',      keys: ['Shift', 'Click'],        label: 'Select an entry (starts Select mode), then a range' },
  { id: 'ctrl-click',       keys: ['Ctrl', 'Click'],         label: 'Remove one entry from the selection' },
  { id: 'ctrl-shift-click', keys: ['Ctrl', 'Shift', 'Click'], label: 'Remove a range from the selection' },
  { id: 'folder-click',     keys: ['Shift', 'Click'],        label: 'On a folder header: select everything inside it' },
];

export const SELECTION_GESTURES_LABEL = 'Selecting with the mouse';

// Drag-and-drop vocabulary and timings.
//
// A drop target is a *position*, and the position implies the parent: dropping
// between two entries inside a folder joins that folder, dropping between two
// top-level rows leaves every folder, and dropping onto a folder header files
// into it. One rule covers reordering and re-filing, which is what lets a drag
// commit as a single history step.
export const DROP_KINDS = {
  ENTRY:  'entry',    // before/after a specific entry, inheriting its folder
  FOLDER: 'folder',   // onto a folder header — file into that folder
  ROOT_END: 'root-end',     // the run-off zone below the list — top level, at the end
  FOLDER_BEFORE: 'folder-before', // the top edge of a folder header — become that
                                  //   folder's sibling, immediately before it. The only
                                  //   way to reorder folders: every row around a folder
                                  //   belongs to some folder, so an entry-row drop always
                                  //   reads as "join that folder" instead.
};

export const DROP_EDGES = { BEFORE: 'before', AFTER: 'after' };

// What is being dragged.
export const DRAG_KINDS = { ENTRIES: 'entries', FOLDER: 'folder' };

// Fraction of a folder header's height, measured from the top, that means
// "before this folder" rather than "into it" while dragging a folder. Small
// enough that aiming at the header still means "into" by default.
export const FOLDER_BEFORE_BAND = 0.35;

// Hover this long over a tucked folder and it opens so you can drop inside it.
// Long enough not to fire while passing over on the way somewhere else.
export const SPRING_OPEN_MS = 650;

// Auto-scroll: how close to an edge of the scroll container starts scrolling,
// and how fast. Without this you simply cannot drag to a row that is off
// screen, and a book of any size doesn't fit on one screen.
export const AUTOSCROLL_ZONE_PX  = 56;
export const AUTOSCROLL_MAX_PX   = 18;   // per animation frame, at the very edge

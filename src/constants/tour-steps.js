// The click-through tour offered by the update notice.
//
// This list is the single source for two consumers: verify/screenshots.mjs
// generates one annotated image per step, and FeatureTour renders them in the
// app. Keeping the sequence, titles and captions here means a UI change breaks
// both in the same place, rather than silently rotting the tour while the
// release images stay correct.
//
// What lives here is declarative only — an id, an image, and the words. The
// Playwright work of building each scene (opening menus, importing a file,
// pinning badges) stays in screenshots.mjs, keyed by these ids, so none of that
// ends up in the app bundle.
//
// The captions carry the information and the images support them, never the
// reverse: text baked into a PNG ignores the user's text-size setting, can't be
// selected, and is invisible to a screen reader.

/**
 * Which set of images to show. Bumped when a release's screenshots are
 * regenerated — deliberately not APP_VERSION, so a version bump without new
 * captures can't point the tour at a folder that doesn't exist.
 */
export const TOUR_RELEASE = '0.9.0';

/**
 * Device scale factor the images are captured at. Shared with
 * verify/screenshots.mjs so one number governs both ends: the generator
 * captures at this ratio, and the enlarged view divides by it to display a
 * screenshot at the builder's true on-screen size rather than at raw pixels —
 * which reads as zoomed far too far in.
 */
export const TOUR_CAPTURE_SCALE = 2;

export const TOUR_STEPS = [
  {
    id:    'title-menu',
    file:  '01-title-menu.png',
    title: 'Your lorebooks live in the title',
    body:  'Click the lorebook name at the top of the window. Every book you’ve saved is on the left, import and export on the right. Double-click the title instead to rename the book you’re in.',
    alt:   'The lorebook title menu open, showing a list of saved lorebooks beside import and export controls.',
  },
  {
    id:    'import',
    file:  '02-import.png',
    title: 'Importing asks what you want',
    body:  'Drop a file on that menu and the book list steps aside. You choose what happens to the lorebook you have open — and you get the same four choices wherever you started the import.',
    alt:   'The import flow showing four choices: import as new, append, replace, and back up first.',
  },
  {
    id:    'status-bar',
    file:  '03-status-bar.png',
    title: 'The bar along the bottom',
    body:  'Everything that’s simply true about your work rather than something you do to it: whether you’re saved, your entry count, how much browser storage you’re using, and which version you’re running.',
    alt:   'The status bar across the bottom of the window, showing save state, entry count, version, and controls.',
  },
  {
    id:    'size-menu',
    file:  '04-size-menu.png',
    title: 'One place for every size',
    body:  'Window size, text size, entry height and the + button all live in ⌘ Size, bottom-right. Hover it to peek, click to keep it open. Reset all sizing leaves your text size alone on purpose.',
    alt:   'The Size menu open, with the window-size options flown out to the right.',
  },
  {
    id:    'settings',
    file:  '05-settings.png',
    title: 'Settings is four sections now',
    body:  'Grouped by what you’re changing rather than by whichever feature introduced the setting. Everything starts closed, and the filter box at the top finds a control even if you don’t know its exact name.',
    alt:   'The Settings panel showing four collapsed sections and a filter box.',
  },
  {
    id:    'pull-tab',
    file:  '06-pull-tab.png',
    title: 'The pull tab on the right edge',
    body:  'Click it and your lorebook list opens beside your entries. The window widens to fit it rather than the panel covering what you were reading.',
    alt:   'The pull tab opened, with the lorebook list beside the entry list and the window widened to fit.',
  },
];

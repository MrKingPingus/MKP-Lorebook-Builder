// The click-through tour offered by the update notice.
//
// This list is the single source for two consumers: verify/screenshots.mjs
// generates one annotated image per step, and FeatureTour renders them in the
// app. Keeping the sequence, titles and captions here means a UI change breaks
// both in the same place, rather than silently rotting the tour while the
// release images stay correct.
//
// What lives here is declarative only — an id, an image, and the words. The
// Playwright work of building each scene (opening menus, importing a file) stays
// in screenshots.mjs, keyed by these ids.
//
// `marks` is the numbered annotation list, and it lives here rather than being
// painted into the PNG. Baked in, the legend was pinned to the window's bottom
// edge — so it covered whatever the shot was about whenever that sat low, and it
// vanished the moment someone enlarged the image, taking the explanation with
// it. As HTML it sits outside the image, survives enlarging, scales with the
// text-size setting, and can be read by a screen reader. `selector` is unused by
// the app and kept here only so the labels can't drift out of step with the
// badges the generator draws from the same array.
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
    marks: [
      { selector: '.title-menu .tm-book--active', label: 'Every lorebook you have saved — most recent first' },
      { selector: '.title-menu .tm-sort-btn', label: 'Switch to A–Z if you would rather find them by name', nth: 1, place: 'right' },
      { selector: '.title-menu .tm-new', label: 'Start a new lorebook' },
      { selector: '.title-menu .drop-zone', label: 'Drop a file here to import, or click to browse', place: 'right' },
      { selector: '.title-menu .tm-btn-row', label: 'Download this book as JSON, TXT or DOCX', place: 'right' },
    ],
  },
  {
    id:    'import',
    file:  '02-import.png',
    title: 'Importing asks what you want',
    body:  'Drop a file on that menu and the book list steps aside. You choose what happens to the lorebook you have open — and you get the same four choices wherever you started the import.',
    alt:   'The import flow showing four choices: import as new, append, replace, and back up first.',
    marks: [
      { selector: '.import-flow-title', label: 'The file you picked, and how many entries it holds' },
      { selector: '.import-flow-opt', label: 'Import as new — your current book is untouched', nth: 0, place: 'right' },
      { selector: '.import-flow-opt', label: 'Replace overwrites what is there now', nth: 2, place: 'right' },
      { selector: '.import-flow-opt', label: 'Back up first downloads a copy, then replaces', nth: 3, place: 'right' },
      { selector: '.tm-rail-back', label: 'Back to your lorebooks' },
    ],
  },
  {
    id:    'status-bar',
    file:  '03-status-bar.png',
    title: 'The bar along the bottom',
    body:  'Everything that’s simply true about your work rather than something you do to it: whether you’re saved, your entry count, how much browser storage you’re using, and which version you’re running.',
    alt:   'The status bar across the bottom of the window, showing save state, entry count, version, and controls.',
    marks: [
      { selector: '.status-save', label: 'Whether your work is saved, and how long ago' },
      { selector: '.status-count', label: 'How many entries this lorebook holds' },
      { selector: '.status-version', label: 'Which build you are running — quote this in a bug report' },
      { selector: '.status-right .storage-usage-ring', label: 'Browser storage in use; click for a breakdown' },
      { selector: '.status-item', label: 'Every size setting lives here' },
    ],
  },
  {
    id:    'size-menu',
    file:  '04-size-menu.png',
    title: 'One place for every size',
    body:  'Window size, text size, entry height and the + button all live in ⌘ Size, bottom-right. Hover it to peek, click to keep it open. Reset all sizing leaves your text size alone on purpose.',
    alt:   'The Size menu open, with the window-size options flown out to the right.',
    marks: [
      { selector: '.scale-flyout', label: 'Named presets, or Custom… to type exact numbers', place: 'right' },
      { selector: '.scale-menu', label: 'Each row shows its current value without opening anything', place: 'left' },
    ],
  },
  {
    id:    'settings',
    file:  '05-settings.png',
    title: 'Settings is four sections now',
    body:  'Grouped by what you’re changing rather than by whichever feature introduced the setting. Everything starts closed, and the filter box at the top finds a control even if you don’t know its exact name.',
    alt:   'The Settings panel showing four collapsed sections and a filter box.',
    marks: [
      { selector: '.settings-search-input', label: 'Finds a control even if you do not know its exact name', place: 'left' },
      { selector: '.settings-section-title', label: 'What happens as you write', nth: 0, place: 'left' },
      { selector: '.settings-section-title', label: 'How you drive the app — shortcuts, hotbar, folders', nth: 2, place: 'left' },
    ],
  },
  {
    id:    'pull-tab',
    file:  '06-pull-tab.png',
    title: 'The pull tab on the right edge',
    body:  'Click it and your lorebook list opens beside your entries. The window widens to fit it rather than the panel covering what you were reading.',
    alt:   'The pull tab opened, with the lorebook list beside the entry list and the window widened to fit.',
    marks: [
      { selector: '.lorebook-tab', label: 'Click the tab to open and close the panel', place: 'right' },
      { selector: '.menu-panel .switcher-list', label: 'Your lorebooks, beside your entries rather than over them', place: 'left' },
      { selector: '.entry-card', label: 'The entry list keeps its width — the window grew instead', nth: 0, place: 'left' },
    ],
  },
];

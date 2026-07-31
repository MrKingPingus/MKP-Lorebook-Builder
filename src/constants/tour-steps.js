// The click-through tour offered by the update notice.
//
// This list is the single source for two consumers: verify/screenshots.mjs
// generates one annotated image per step, and FeatureTour renders them in the
// app. Keeping the sequence, titles and captions here means a UI change breaks
// both in the same place, rather than silently rotting the tour while the
// release images stay correct.
//
// What lives here is declarative only — an id, an image, and the words. The
// Playwright work of building each scene (opening menus, importing a file) and
// deciding how tightly to crop it stays in screenshots.mjs, keyed by these ids.
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
// ARRAY ORDER IS THE NUMBERING. The app renders this list counting from 1 and
// the generator draws badge `i + 1` for entry `i`, so reordering an array here
// renumbers the image to match. It follows that the entries must be written in
// the order the badges scan on the image — top to bottom, left to right within a
// row — or the picture counts 1, 2, 3 down the page while the list underneath
// says something else. The generator checks this on every run and prints the
// order to use when they disagree; `place` is the lever for changing where a
// badge lands, not the array position.
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
      { selector: '.title-menu .tm-sort-btn', nth: 1, place: 'tr', label: 'Most recently opened first — switch to A–Z if you would rather find them by name' },
      { selector: '.title-menu .tm-book--active', place: 'tl', label: 'Every lorebook you have saved; the one you are in is highlighted' },
      { selector: '.title-menu .tm-new', place: 'tl', label: 'Start a new lorebook' },
      { selector: '.title-menu .drop-zone', place: 'br', label: 'Drop a file here to import, or click to browse' },
      { selector: '.title-menu .tm-btn-row', place: 'tr', label: 'Download this book as JSON, TXT or DOCX' },
    ],
  },
  {
    id:    'import',
    file:  '02-import.png',
    title: 'Importing asks what you want',
    body:  'Drop a file on that menu and the book list steps aside. You choose what happens to the lorebook you have open — and you get the same four choices wherever you started the import.',
    alt:   'The import flow showing four choices: import as new, append, replace, and back up first.',
    marks: [
      { selector: '.import-flow-title', place: 'tl', label: 'The file you picked, and how many entries it holds' },
      { selector: '.import-flow-opt', nth: 0, place: 'tl', label: 'Import as new — your current book is untouched' },
      { selector: '.import-flow-opt', nth: 1, place: 'tr', label: 'Append — adds those entries to the book you are in' },
      { selector: '.import-flow-opt', nth: 2, place: 'bl', label: 'Replace — overwrites what is there now' },
      { selector: '.import-flow-opt', nth: 3, place: 'br', label: 'Back up first — downloads a copy, then replaces' },
    ],
  },
  {
    id:    'status-bar',
    file:  '03-status-bar.png',
    title: 'The bar along the bottom',
    body:  'Everything that’s simply true about your work rather than something you do to it: whether you’re saved, your entry count, how much browser storage you’re using, and which build you’re on. The bug and idea links moved down here too.',
    alt:   'The status bar across the bottom of the window, showing save state, entry count, version, feedback links, storage use and the Size button.',
    marks: [
      { selector: '.status-save', place: 'tr', label: 'Whether your work is saved, and how long ago' },
      { selector: '.status-count', place: 'tr', label: 'How many entries this lorebook holds' },
      { selector: '.status-version', place: 'tl', label: 'Which build you are running — quote this in a bug report' },
      { selector: '.status-right .header-feedback', place: 'tl', label: 'Report a bug, or suggest a feature' },
      { selector: '.status-right .storage-usage-ring', place: 'tl', label: 'Browser storage in use; click it for a breakdown' },
      { selector: '.status-item', place: 'tl', label: 'Every size setting lives here' },
    ],
  },
  {
    id:    'size-menu',
    file:  '04-size-menu.png',
    title: 'One place for every size',
    body:  'Window size, text size, entry height and the + button all live in the Size button at the bottom-right. Hover it to peek, click to keep it open. Reset all sizing leaves your text size alone on purpose.',
    alt:   'The Size menu open, with the window-size options flown out to the left.',
    marks: [
      { selector: '.scale-flyout', place: 'tl', label: 'Named presets, or Custom… to type exact numbers' },
      { selector: '.scale-menu', place: 'tl', label: 'Each row shows what it is set to without opening anything' },
      { selector: '.status-item', place: 'tr', label: 'Hover to peek at the menu, click to keep it open' },
    ],
  },
  {
    id:    'settings',
    file:  '05-settings.png',
    title: 'Settings is four sections now',
    body:  'Grouped by what you’re changing rather than by whichever feature introduced the setting. Everything starts closed, and the filter box at the top finds a control even if you don’t know its exact name.',
    alt:   'The Settings panel showing four collapsed sections and a filter box.',
    marks: [
      { selector: '.settings-search-input', place: 'tl', label: 'Finds a control even if you do not know its exact name' },
      { selector: '.settings-section-title', nth: 0, place: 'tr', label: 'What happens as you write' },
      { selector: '.settings-section-title', nth: 2, place: 'tr', label: 'How you drive the app — shortcuts, hotbar, folders' },
    ],
  },
  {
    id:    'pull-tab',
    file:  '06-pull-tab.png',
    title: 'The pull tab on the right edge',
    body:  'Click it and your lorebook list opens beside your entries. The window widens to fit the panel rather than the panel covering what you were reading.',
    alt:   'The pull tab opened, with the lorebook list beside the entry list and the window widened to fit.',
    marks: [
      { selector: '.entry-card', nth: 0, place: 'tr', label: 'Your entries keep their width — the window grew to make room' },
      { selector: '.menu-panel .switcher-list', place: 'tl', label: 'Your lorebooks, beside your entries rather than over them' },
      { selector: '.lorebook-tab', place: 'tl', label: 'The tab rides the window’s edge; click it to open or close the panel' },
    ],
  },
];

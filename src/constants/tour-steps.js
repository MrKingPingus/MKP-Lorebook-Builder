// The guided tour of a release's new features.
//
// The tour drives the **real app**: it spotlights a live control, explains it,
// and lets the user tap it for real. Until 0.10.0 it was a modal gallery of
// annotated screenshots, and the reason it isn't any more is worth keeping,
// because the old design's own header comment argued the opposite case.
//
// That comment said a live tour "would have to drive app state" because "the
// things worth pointing at mostly don't exist until something is open". True
// when written. Phase 14 then built and proved the route to every mobile layer,
// so the arrival problem became tractable — see `arrive` below.
//
// What forced the change was measuring the gallery at 360x640. The captures
// rendered at **18-22% of life size** (a 1257px-wide window inside a 272px
// image box), "click to enlarge" gained 48px against a `max-width` cap, and one
// notch of the text-size setting pushed Back/Next out of a panel with no scroll
// container — the tour could not be advanced or finished. Cropping tighter got
// to 77% and no further. An image of a phone, read on a phone, is always
// smaller than the phone. The format was the problem, not the crop.
//
// ── shape of a step ─────────────────────────────────────────────────────────
//
// `target`  CSS selector for the control to spotlight. One element; the first
//           match wins. If it never appears the runner skips the step rather
//           than spotlighting nothing.
// `title`   Heading, a short claim.
// `body`    The caption. **Keep it under ~300px rendered**, which in practice
//           means under about 220 characters: `use-anchored-position.js` flips
//           the bubble on which half of the viewport the target sits in rather
//           than on a fit test, and that heuristic is only safe while the
//           bubble is shorter than half the screen. A long caption is how the
//           bubble ends up covering what it points at.
// `advanceOn` Optional selector meaning *the user did the thing*. Once it
//           appears, the tour moves to the next step on its own. This is what
//           makes a real tap worth allowing: without it, tapping the spotlit
//           title opened the menu and the tour just sat there, ring still around
//           where the title used to be and the bubble covering the list the user
//           had been told to look at. Only a false→true transition counts, so
//           stepping Back into a step whose condition is still satisfied doesn't
//           bounce straight forward again.
// `arrive`  Optional `async (api) => {}` putting the app into the state where
//           `target` exists. Must be **idempotent** — it runs on entering the
//           step, and again if the user closes what it opened. It receives an
//           api object built by `use-tour.js`; this file stays declarative and
//           imports no hooks, the same division the old generator used to keep
//           its Playwright work out of here.
//
// ── two rules learned the hard way ──────────────────────────────────────────
//
// 1. **Spotlight a representative instance, never a container.** A target
//    taller than about half the screen leaves the bubble nowhere to go on
//    either side. Step 2 is about the filter row, not the list it sits above;
//    step 3 is about one condensed card, not all eight of them.
// 2. **The list is a path, not a set.** Because taps really work, step 4's
//    target does not exist until the app has been walked there. Steps cannot be
//    reordered freely and cannot be jumped between — which is why the tour has
//    Back and Next and no clickable step dots. A dot row that cannot honour a
//    click is worse than the plain "3 of 5" it replaced.
//
// Comparative claims are stated as numbers in the caption and never shown. A
// live app can only ever be the *after*, and the numbers are the interesting
// part anyway.

/**
 * Mobile steps — everything 0.10.0 changed. Ordered as a walk through the app:
 * header, then the list controls, then select mode, then the two destinations
 * that had no door before.
 */
export const TOUR_STEPS_MOBILE = [
  {
    id:        'title',
    target:    '.title-field--mobile',
    title:     'Your lorebook lives in the title',
    body:      'It wears the same outlined style it has on a desktop, because it does the same thing. Give it a tap.',
    arrive:    async (api) => { await api.closeLayers(); },
    advanceOn: '.mtm-body',
  },
  {
    id:     'title-menu',
    target: '.mtm-row-wrap',
    title:  'Every book you have saved',
    body:   'Switch between them, start a new one, or rename and delete any of them from the ⋯ menu. The second tab holds import and export. On a phone none of this was reachable before.',
    arrive: async (api) => { await api.openTitleMenu(); },
  },
  {
    id:     'filters',
    target: '.search-bar-row2',
    title:  'One row, not three',
    body:   'Search, mode and filters share a row now, and everything you tap here carries a full-size touch target. The chrome above your first entry went from 236px to 170px.',
    arrive: async (api) => { await api.closeLayers(); },
  },
  {
    id:     'select',
    target: '.bulk-actions-btn',
    title:  'Selecting shows a condensed list',
    body:   'Name and checkbox only, with the type still shown as the colour down the edge — and one Actions menu instead of eight buttons. Select mode went from two entries on screen to eight.',
    arrive: async (api) => {
      await api.closeLayers();
      await api.setSearchMode('select');
      await api.selectFirstEntry();
    },
  },
  {
    id:     'reference',
    target: '.ref-chooser-list',
    title:  'Pair a reference lorebook from anywhere',
    body:   'One chooser, reached from the lorebook menu, a book\'s ⋯ menu, the hotbar, the Lorebooks panel or Settings. It says what pairing does, so you can decide before committing.',
    arrive: async (api) => {
      await api.setSearchMode('search');
      await api.openReferenceChooser();
    },
  },
  {
    id:     'lander',
    target: '.settings-lander-btn',
    title:  'And a way back out',
    body:   'At the foot of Settings. On a phone this was previously unreachable without reloading — which meant no route to a new lorebook, your recent books, or What\'s new.',
    arrive: async (api) => {
      await api.closeLayers();
      await api.openSettings();
      await api.scrollIntoView('.settings-lander-btn');
    },
  },
];

/**
 * Desktop steps. Empty on purpose: 0.10.0 changed nothing on a desktop, so the
 * lander offers no tour there rather than offering one that says so. The list
 * fills in the first time a release has something desktop-shaped to say — the
 * spotlight, the bubble, the runner and the demo books are all viewport-blind.
 */
export const TOUR_STEPS_DESKTOP = [];

/** The step list for a viewport, or an empty list when there's nothing to tour. */
export function tourStepsFor({ isMobile }) {
  return isMobile ? TOUR_STEPS_MOBILE : TOUR_STEPS_DESKTOP;
}

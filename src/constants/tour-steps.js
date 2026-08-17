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
// `target`  CSS selector, or an array of them, for the controls to spotlight.
//           The first match of each is used. **Only the first selector is
//           required** — the rest may be absent without failing the step, which
//           is what lets a step point at a control that is conditional. If the
//           first never appears the runner skips the step rather than
//           spotlighting nothing. Every selector named in the caption should be
//           in here: a caption that mentions a control the scrim has dimmed into
//           the background is worse than one that does not mention it.
// `title`   Heading, a short claim.
// `body`    The caption. **Under 220 characters, and under 160 is better.** Not
//           only a style rule: the bubble is placed in whichever gap around the
//           spotlight has room for it, and a caption long enough to fit neither
//           gap gets clamped into the viewport on top of something. See
//           `docs/tour-voice.md` for how to write these — the first pass was
//           written from CHANGELOG.md and read like it.
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
// 1. **Spotlight a representative instance, not a container** — the filter row
//    rather than the list it sits above, one book row rather than the whole
//    menu. A target much taller than half the screen leaves the caption nowhere
//    good to go. The one deliberate exception is `select-actions`, where the
//    open menu *is* the subject; `place()` in FeatureTour.jsx exists to cope.
// 2. **The list is a path, not a set.** Because taps really work, a later step's
//    target does not exist until the app has been walked there. Steps cannot be
//    reordered freely or jumped between — which is why the tour has Back and Next
//    and no clickable dots. A dot row that cannot honour a click is worse than
//    the plain "3 of 8" it replaced.
// 3. **A step that mentions a tap should invite one.** `advanceOn` is what makes
//    the invitation real, and three steps here are built as invitation-then-
//    payoff pairs: tap the title → what the menu holds; open Actions → what is
//    in it; tap the gear → the way home. The payoff step's `arrive` still opens
//    the thing itself, so Next works for someone who would rather not tap.
//
// Comparisons to older versions are avoided, not just softened. "This was
// unreachable before" means nothing to a new user and reads as an apology to a
// returning one.

/**
 * Mobile steps — everything 0.10.0 changed. Ordered as a walk through the app:
 * header, then the list controls, then select mode, then the two destinations
 * that had no door before.
 */
export const TOUR_STEPS_MOBILE = [
  {
    id:        'title',
    target:    '.title-field--mobile',
    title:     'Your lorebook name is a button',
    body:      'It sits in the title bar, the way it does on a desktop. Give it a tap.',
    arrive:    async (api) => { await api.closeLayers(); },
    advanceOn: '.mtm-body',
  },
  {
    // Two holes: the book list and the tab beside it. The tab is named in the
    // caption, so it has to be visible and tappable — a caption that mentions a
    // control the scrim has dimmed into the background is worse than not
    // mentioning it.
    id:     'title-menu',
    target: ['.mtm-row-wrap', '.mtm-tab:not(.mtm-tab--on)'],
    title:  'Every book you have saved',
    body:   'Switch between them, or rename and delete from the ⋯ menu. Import and export live on the other tab.',
    arrive: async (api) => { await api.openTitleMenu('lorebooks'); },
  },
  {
    id:     'filters',
    target: '.search-bar-row2',
    title:  'More room for your entries',
    body:   'Searching and filtering used to take three rows. Now it is one, so you see more of your work and less of the toolbar.',
    arrive: async (api) => { await api.closeLayers(); },
  },
  {
    id:        'select',
    target:    '.bulk-actions-btn',
    title:     'Pick several entries at once',
    body:      'Selecting shows a short list, so eight fit where two used to. Everything you can do to the ones you picked is under Actions — open it and see.',
    arrive:    async (api) => {
      await api.closeLayers();
      await api.setSearchMode('select');
      await api.selectFirstEntries();
    },
    advanceOn: '.bulk-actions-menu',
  },
  {
    // The menu the previous step invited. It opens downward and is tall, which is
    // what caught the old placement code out — see `place()` in FeatureTour.jsx.
    id:     'select-actions',
    target: '.bulk-actions-menu',
    title:  'Change type, file, hide, export',
    body:   'All of it in one menu, with the number you picked beside it. This used to be eight buttons wrapped across three lines.',
    arrive: async (api) => {
      await api.setSearchMode('select');
      await api.selectFirstEntries();
      await api.openSelectActions();
    },
  },
  {
    id:     'reference',
    target: '.ref-chooser-current',
    title:  'Keep a second book open beside your own',
    body:   'A reference book you can read from and copy out of while you write. Here it is paired with a set of style notes.',
    arrive: async (api) => {
      await api.setSearchMode('search');
      await api.pairSampleReference('Style Notes');
      await api.openReferenceChooser();
    },
  },
  {
    id:        'gear',
    target:    '.menu-btn--gear',
    title:     'One more thing, behind the gear',
    body:      'Tap it.',
    arrive:    async (api) => { await api.closeLayers(); },
    advanceOn: '.menu-panel--expanded',
  },
  {
    id:     'lander',
    target: '.settings-lander-btn',
    title:  'The way back to your home screen',
    body:   'Right at the bottom of Settings. That is where new lorebooks, your recent books and What\'s new live.',
    arrive: async (api) => {
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

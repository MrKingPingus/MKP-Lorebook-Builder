# verify/ — browser-driven behavioural checks

A small Playwright harness that drives the **real app** in a headless browser to
confirm entry-level features actually work end-to-end — not just that the build
compiles. It exists mainly so the tricky **navigation pathways** through the
builder are captured once and reused, instead of being re-derived every time.

```bash
npm run verify
```

That's it. The runner starts a dev server if one isn't already up (and stops it
afterward), runs every scenario, and exits non-zero if anything fails — so it
can gate CI or a pre-push hook.

## Layers

Two, and they run in this order:

1. **Pure-logic checks** — in-process, no browser, no dev server, milliseconds.
   `keychord-checks.mjs` (the macOS Option-key paths the Linux-only browser
   suite can't reach) and `folder-tree-checks.mjs` (the folder splice and render
   walk, which are far cheaper to exercise exhaustively here than through the
   UI). Prefer this layer for anything pure — it's effectively free.
2. **Browser scenarios** — `checks.mjs`, driving the real app headlessly. A
   fresh browser per scenario, so no state leaks between them.
3. **Mobile scenarios** — `mobile-checks.mjs`, same idea below the 768px
   breakpoint, plus the layout sweeps described under **The mobile suite**.

## Fixtures

- **`fixtures/reika-test-book.json`** — the primary book. 34 entries,
  29 public / 5 private, 0 hidden-from-export. Most assertions are anchored to
  these numbers.
- **`fixtures/reika-test-book-variant.json`** — the second book, for
  crosstalk/reference checks. **Generated** by
  `node fixtures/build-variant-book.mjs`, which documents every deliberate
  difference and exports the expected counts (`VARIANT_COUNTS`) so scenarios
  import them rather than hard-coding numbers that could drift. Edit the
  generator, not the JSON, and commit both.

## Files

- **`driver.mjs`** — the reusable pathways. Import these instead of re-figuring
  out the UI:
  - `openBuilderWithFixture(page)` — lander → builder by importing the fixture
    through the "Import File" tile (which opens the OS picker and loads the file
    directly, no disposition prompt or name modal), returns the entry-card count.
  - `enterSelectMode(page)` — switch the search bar into Select mode.
  - `exportJson(page)` — click the hotbar Export button, capture the JSON
    download, return the parsed CharSnap object. `countPrivate(book)` tallies
    `isPublic === false`. (Exporting is the real signal for `isPublic`, which
    has no collapsed-card badge.)
  - `openSettings(page)` — open the Settings panel from the header ☰ menu.
  - `launch({ mobile })` — headless browser + context; `mobile: true` for a
    touch viewport.
  - `pairCrosstalk(page)` — the full two-book pose: primary fixture active, the
    derived variant as the read-only reference. Loads the variant *first*,
    because importing a book as new makes it active, so importing the primary
    second leaves the primary active. Viewport-agnostic since 14B: it pairs
    through the reference chooser, which exists on both sides of the
    breakpoint, and waits on whichever surface that viewport renders
    (`.reference-panel-entries` on desktop, `.role-swap-segmented` on mobile).
  - `openReferenceChooser(page)` — open the chooser via Settings → Layout &
    Controls. The route that works at any width; before 14B the only picker in
    the app was a `<select>` in a side panel mobile could not reach, which is
    why this file had no mobile crosstalk pathway at all.
  - `pairCrosstalkMobile(page)` — pairs the way a phone user does: title menu →
    the book's ⋯ menu → **Pair as reference**. Walks the rows to find the one
    offering it, since the active book cannot reference itself.
  - `openMobileTitleMenu(page, tab?)` / `closeMobileTitleMenu(page)` — the
    mobile title menu, opened by tapping the lorebook name. Works in both
    role-bar poses: solo renders `.lorebook-bar-title-btn`, and once a
    reference is paired the active segment's name carries the same door.
    Pass a tab substring (`'Import'`) to land on the other tab.
  - `importBookAsNew(page, path)` — import a file as a second lorebook rather
    than appending it to the current one.
  - `openSettingsSection(page, title)` — expand a Settings accordion section.
    Collapsed sections render no children at all, so this is a prerequisite for
    touching anything inside one.
  - `selectCards(page, container, indices)` — select entry cards in select mode.
    Clicks each card's `.entry-label`, never the card's centre: the select-mode
    type dropdown calls `stopPropagation`, and in a narrow crosstalk pane it
    sits right under the midpoint, so a centre-click selects nothing.

- **`checks.mjs`** — the browser scenarios: import parity, Public/Private,
  Hide-from-Export, hotkeys and the Escape stack, themes and accessibility,
  expand/collapse, folders, and crosstalk. Values are anchored to the fixtures.
- **`keychord-checks.mjs`** — pure-logic checks for the keychord matcher.
- **`folder-tree-checks.mjs`** — pure-logic checks for the folder splice, the
  render walk, the folder filter (including the pruning that keeps a stale
  selection from blanking the list), and folder ordering under the alpha sorts.
- **`selection-range-checks.mjs`** — pure-logic checks for the modifier+click
  gesture table (shift adds, ctrl removes, ranges, anchor fallbacks).
- **`drag-drop-checks.mjs`** — pure-logic checks for drop resolution: reorder,
  the position-decides-the-folder rule, multi-drag, folder moves, and the
  "nothing is ever lost" invariant on every path.
- **`mobile-checks.mjs`** — the mobile scenarios and layout sweeps. See below.
- **`layout-invariants.mjs`** — the sweep battery: structure-agnostic layout
  rules, usable at any viewport.
- **`run.mjs`** — `npm run verify` entry point (server lifecycle + exit code).

## The mobile suite

The mobile UI is a separate surface rather than a reflow — 18 files branch on
`useMobile()`, and `EntryDetailPanel`, `ReferenceBrowseSheet` and
`ReferenceEntryOverlay` exist only below the breakpoint — so it gets its own
file. It runs as part of `npm run verify`; `npm run verify -- mobile` runs it
alone, which works because every scenario name starts with `Mobile`.

### Sweeps vs. scenarios

Two kinds of assertion, graded apart:

- **`check(label, got, want)`** — an ordinary behavioural expectation. Fails the
  run.
- **`sweepPose(label, { scope })`** — runs the whole invariant battery against
  whatever is on screen right now. Hard rules (off-screen, body overflow-x,
  occlusion, page errors) fail; everything else is recorded as a **note**.
- **`quirk(label, got, want)`** — asserts what the app *should* do without
  failing when it doesn't. Use it for known-wrong behaviour: writing `check`
  against today's output would pin the bug as correct, so that a fix would have
  to delete the assertion.

The notes are the point, not a consolation prize — the suite was written to find
the pre-overhaul quirks, and a run ends with a roll-up by rule. See
`docs/mobile-findings.md`.

### `scope`, and why it matters

Pass `scope` whenever a layer is open. It restricts the interactive rules to that
layer, so controls legitimately sitting behind a full-screen panel are not each
reported as occluded. Without it, opening Settings on mobile reports every
builder control underneath as unreachable.

Unscoped sweeps still grade a cover down to `occluded-by-overlay` (a note) when
the covering element is recognisably a layer. Two tests, and the second is the
one that matters: either the covering element's class names read as a backdrop,
**or** its nearest `position: fixed` ancestor does not contain the covered
element — structurally, "a layer is open over this". The second test is there
because the first is markup-dependent in a battery that is otherwise
structure-agnostic: every portalled dialog the mobile overhaul adds would
otherwise read as a hard `occluded` failure for everything beneath it.

### Adding a pose

Sweeps are grouped into families — one browser per family, walking several poses
— rather than one browser per pose, which would treble the runtime. Gestures do
not compose freely inside a family: tapping the FAB opens the detail panel *over*
the FAB, so a later gesture at the same coordinates hits the panel. Close what
you opened, and prefer a new scenario over a long chain.

### Touch

- **`tap(page, locator)`** — a real touch tap via `page.touchscreen`.
- **`longPress(page, locator, ms)`** — a held touch, for the 450ms long-press
  paths (`Hotbar`, `Chip`, `SuggestionsTray`). This goes through a CDP session,
  and that session needs `Emulation.setTouchEmulationEnabled` before
  `Input.dispatchTouchEvent` does anything — without it the events are dropped
  silently, which looks exactly like the app ignoring the gesture. `driver.mjs`
  handles this; the note is here because the failure mode is so misleading.
- **`parkMouse(page)`** — moves the pointer out of the way. A real phone has no
  hover, but Playwright's mouse stays where the last click left it, and at
  desktop widths that can sit over a hover-activated surface. `sweepPose` calls
  it automatically.

### Always-mounted layers

`.entry-detail-panel` and `.menu-panel` are always in the DOM — `--open` and
`--expanded` are the real signals. Checking for the element rather than the
modifier is silently wrong.

### Stress fixtures

`fixtures/build-stress-book.mjs` generates books at the caps in
`constants/limits.js` — 25 triggers, a 1500-character description,
240-character names, 500 entries. Output is **not** committed: books are written
to `verify/.tmp/` (gitignored) at run time, because no scenario imports stable
counts from them the way the crosstalk scenarios import `VARIANT_COUNTS`. The
generator is committed and runs standalone, which is what reproducing a failure
by hand needs:

```bash
node fixtures/build-stress-book.mjs --preset maxed-entry
node fixtures/build-stress-book.mjs --entries 500 --out /tmp/big.json
```

Everything is seeded, so the same arguments always give the same book.

## Running a subset

A full run launches a fresh browser per scenario and takes several minutes.
While iterating on one area, filter by name:

```bash
npm run verify -- folders        # only scenarios with "folders" in the name
npm run verify -- "Drag:"        # only the drag scenarios
npm run verify -- drag,selection # comma-separated terms, any match
npm run verify -- mobile         # the whole mobile suite
npm run verify -- "mobile sweep" # the layout sweeps only
VERIFY_ONLY=crosstalk npm run verify
```

The filter applies to the desktop and mobile suites alike, so a term that
matches nothing on one side simply runs nothing there.

Matching is case-insensitive substring. The pure-logic checks take milliseconds
so they always run regardless of the filter. Run the whole suite before pushing.

## Testing the production build

`npm run verify` starts a dev server. Before a release, run it against the
*built* artifact instead — that is what actually ships:

```bash
npm run build
npx vite preview --port 4173 --strictPort &
VERIFY_URL=http://localhost:4173/ npm run verify
```

CI does this too, so a PR exercises the production bundle rather than the dev
server.

## Driving drags

`dragTo` in the driver runs a real native HTML5 drag (mousedown on the handle,
a nudge to cross the drag threshold, then a move to the target). Two things
about it are worth knowing before adding a drag scenario:

- **Measure the target during the drag, not before.** The run-off drop zone
  below the list is 0px tall until a drag starts, so a box taken beforehand is
  a zero-height strip the pointer can never land on. `dragTo` handles this.
- **Never let a drop target resize the list.** A zone that grows when a drag
  begins shifts every row out from under the cursor, and scrolling the list
  mid-drag desynchronises Playwright's drag manager so the *next* drag hangs on
  `mouse.move`. The tail zone can grow because it sits below everything; the
  equivalent above the list could not, which is why "before this folder" is a
  band on the folder header rather than a zone at the top.
- **Keep drags out of the auto-scroll zone.** Scrolling the list mid-drag
  desynchronises Playwright's drag manager, and the *next* drag in that page
  then hangs on `mouse.move`. This is a harness limitation, not an app bug —
  auto-scroll works in a real browser. Scenarios avoid it by dragging near the
  top of the list, or by narrowing the list (search or the folder filter) so
  everything fits on screen without scrolling.

## Browser resolution

`driver.mjs` finds Chromium in this order, so it runs anywhere:

1. `$PW_CHROMIUM_PATH` if set,
2. a `chromium-*/chrome-linux/chrome` under `$PLAYWRIGHT_BROWSERS_PATH` (the
   remote container ships one — no download needed),
3. otherwise Playwright's managed browser — on a local machine run
   `npx playwright install chromium` once.

## Timing

Every fixed wait goes through `settle(page, ms)` rather than
`page.waitForTimeout` directly, so there is one dial for all of them.
`VERIFY_WAIT_SCALE` multiplies it, and CI defaults to 3× because a shared runner
is slower and more variable than a dev machine. Locally the scale is 1, so
normal runs are unaffected. If a scenario ever goes flaky on CI, raise the scale
before reaching for anything cleverer.

## Continuous integration

`.github/workflows/verify.yml` runs this suite on every pull request and every
push to `main`, and also fails if the generated variant fixture is stale. It
**reports only** — by design. It never gates the Pages deploy and never blocks a
merge, so a red run can't leave anyone with a site that won't update or a PR
that won't merge. The project's real test loop is a preview deploy plus a human
looking at it; this suite is the safety net underneath that, for the classes of
bug eyeballs don't catch.

## Adding a scenario

Add a `scenario('name', async (page, check) => { … })` to the `SCENARIOS` array
in `checks.mjs`, using the driver helpers and `check(label, got, want)`. If you
touch the fixture's public/private/type counts, update the expected values here.

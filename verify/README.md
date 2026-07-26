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
    second leaves the primary active.
  - `importBookAsNew(page, path)` — import a file as a second lorebook rather
    than appending it to the current one.
  - `openSettingsSection(page, title)` — expand a Settings accordion section.
    Collapsed sections render no children at all, so this is a prerequisite for
    touching anything inside one.
  - `selectCards(page, container, indices)` — select entry cards in select mode.
    Clicks each card's `.entry-label`, never the card's centre: the select-mode
    type dropdown calls `stopPropagation`, and in a narrow crosstalk pane it
    sits right under the midpoint, so a centre-click selects nothing.

## Continuous integration

`.github/workflows/verify.yml` runs this suite on every pull request and every
push to `main`, and also fails if the generated variant fixture is stale. It
**reports only** — by design. It never gates the Pages deploy and never blocks a
merge, so a red run can't leave anyone with a site that won't update or a PR
that won't merge. The project's real test loop is a preview deploy plus a human
looking at it; this suite is the safety net underneath that, for the classes of
bug eyeballs don't catch.

- **`checks.mjs`** — the scenarios (import parity + private-by-default, bulk
  Hide/Show, bulk Public/Private, the opt-in private marker). Values are
  anchored to `fixtures/reika-test-book.json` (34 entries, 29 public / 5
  private).
- **`run.mjs`** — `npm run verify` entry point (server lifecycle + exit code).

## Browser resolution

`driver.mjs` finds Chromium in this order, so it runs anywhere:

1. `$PW_CHROMIUM_PATH` if set,
2. a `chromium-*/chrome-linux/chrome` under `$PLAYWRIGHT_BROWSERS_PATH` (the
   remote container ships one — no download needed),
3. otherwise Playwright's managed browser — on a local machine run
   `npx playwright install chromium` once.

## Adding a scenario

Add a `scenario('name', async (page, check) => { … })` to the `SCENARIOS` array
in `checks.mjs`, using the driver helpers and `check(label, got, want)`. If you
touch the fixture's public/private/type counts, update the expected values here.

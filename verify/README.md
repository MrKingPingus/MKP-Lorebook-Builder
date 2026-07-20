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

## Files

- **`driver.mjs`** — the reusable pathways. Import these instead of re-figuring
  out the UI:
  - `openBuilderWithFixture(page)` — lander → builder, dismiss the "Name your
    lorebook" modal, import the fixture (Import File → mode → "Import N
    entries"), return the entry-card count.
  - `enterSelectMode(page)` — switch the search bar into Select mode.
  - `exportJson(page)` — click the hotbar Export button, capture the JSON
    download, return the parsed CharSnap object. `countPrivate(book)` tallies
    `isPublic === false`. (Exporting is the real signal for `isPublic`, which
    has no collapsed-card badge.)
  - `openSettings(page)` — open the Settings panel from the header ☰ menu.
  - `launch({ mobile })` — headless browser + context; `mobile: true` for a
    touch viewport.
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

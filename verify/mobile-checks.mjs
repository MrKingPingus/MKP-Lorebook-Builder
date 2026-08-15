// Mobile behavioural checks and layout sweeps.
//
// Split from checks.mjs because the mobile UI is not a reflow of the desktop
// one — 18 files branch on `useMobile()`, and EntryDetailPanel,
// ReferenceBrowseSheet and ReferenceEntryOverlay exist only below the
// breakpoint — so it is a separate surface, not a variant of an existing one.
//
// Two kinds of assertion, deliberately graded apart:
//
//   check(...) — a behavioural expectation. Failing one fails the run.
//   note(...)  — a layout-invariant violation that is not obviously a
//                regression. Recorded, counted and printed, but does not fail.
//
// The grading exists because this suite was written to *find* the quirks in the
// pre-overhaul mobile UI, not to pin them. A suite that failed on all of them
// would be red from its first run and would bury any real regression.
import { launch, openBuilderWithFixture, importBookAsNew, openSettings, openSettingsSection, enterSelectMode, selectCards, pairCrosstalk, pairCrosstalkMobile, openMobileTitleMenu, settle, tap, longPress, openEntryDetail, closeEntryDetail, openFilterPopover, dismissPopover, seedStorage, parkMouse, VARIANT_FIXTURE } from './driver.mjs';
import { sweep, watchErrors } from './layout-invariants.mjs';
import { writePreset, LIMITS } from '../fixtures/build-stress-book.mjs';
import { fileURLToPath } from 'node:url';

// Generated books land here, gitignored. Written on demand by the stress
// scenarios rather than committed — see fixtures/build-stress-book.mjs.
const TMP = fileURLToPath(new URL('./.tmp/', import.meta.url));
const stressBook = (preset) => writePreset(preset, `${TMP}${preset}.json`);

// The canonical phone. Poses that are not viewport-sensitive are swept here
// only, to keep browser launches (and so runtime) down.
const PHONE = { mobile: true, width: 390, height: 844 };

// The matrix, for the poses where width genuinely changes the outcome.
//
// Portrait only, by decision (2026-08-11): landscape is not a supported pose and
// will not be until someone asks for it. A phone turned sideways is ~780px wide,
// which is past the `innerWidth < 768` breakpoint, so it gets the desktop layout
// in a 360px-tall viewport — out of scope rather than broken. To check it, add
// `{ label: 'landscape', mobile: true, width: 780, height: 360 }` here.
const VIEWPORTS = [
  { label: 'small phone',  mobile: true, width: 360, height: 640 },
  { label: 'phone',        mobile: true, width: 390, height: 844 },
  { label: 'large phone',  mobile: true, width: 414, height: 896 },
  { label: 'breakpoint-1', mobile: true, width: 767, height: 1024 },
];

function scenario(name, fn, launchOptions = PHONE) {
  return { name, fn, launchOptions };
}

async function runScenario({ name, fn, launchOptions }) {
  const results = [];
  const notes = [];

  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  // Assert what the app *should* do, without failing the run when it doesn't.
  //
  // The alternative — writing `check` against today's behaviour — would pin the
  // bug as correct, and the overhaul would then have to delete the assertion to
  // fix it. A quirk records the gap instead, so the intent survives in the suite
  // and the finding shows up in the roll-up.
  const quirk = (label, got, want) => {
    if (got === want) {
      results.push(true);
      console.log(`  PASS  ${label}: ${JSON.stringify(got)}`);
      return;
    }
    notes.push({ pose: 'behaviour', rule: 'quirk', selector: label, detail: `got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`, count: 1 });
    console.log(`  note  quirk: ${label} — got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
  };

  const { browser, page } = await launch(launchOptions);
  const errors = watchErrors(page);

  // Sweep the current pose and fold the result into this scenario's tally.
  // Hard rules fail; everything else is noted.
  const sweepPose = async (poseLabel, opts = {}) => {
    await parkMouse(page);
    const { failures, notes: soft } = await sweep(page, { ...opts, errors: errors.splice(0) });
    const times = (v) => (v.count > 1 ? ` ×${v.count}` : '');
    for (const f of failures) {
      results.push(false);
      console.log(`  FAIL  [${poseLabel}] ${f.rule}${times(f)}: ${f.selector} — ${f.detail}`);
    }
    for (const n of soft) {
      notes.push({ pose: poseLabel, ...n });
      console.log(`  note  [${poseLabel}] ${n.rule}${times(n)}: ${n.selector} — ${n.detail}`);
    }
    if (failures.length === 0) {
      results.push(true);
      console.log(`  PASS  [${poseLabel}] no hard layout violations (${soft.length} note${soft.length === 1 ? '' : 's'})`);
    }
  };

  console.log(`\n▶ ${name}`);
  try {
    await fn(page, check, sweepPose, quirk);
  } catch (e) {
    console.log('  ERROR:', e.message);
    results.push(false);
  } finally {
    await browser.close();
  }
  return { ok: results.every(Boolean), notes };
}

const SCENARIOS = [
  // ── Core list, across the whole viewport matrix ────────────────────────────
  ...VIEWPORTS.map((vp) => scenario(
    `Mobile sweep: builder list — ${vp.label} ${vp.width}x${vp.height}`,
    async (page, check, sweepPose) => {
      await openBuilderWithFixture(page);
      await settle(page, 400);
      await sweepPose('entry list');

      // The breakpoint itself, asserted rather than assumed: below it the slim
      // mobile card renders, at or above it the desktop card does.
      const mobileCards  = await page.locator('.entry-card--mobile').count();
      const expectMobile = vp.width < 768;
      check(`mobile cards ${expectMobile ? 'render' : 'do not render'} at ${vp.width}px`,
        mobileCards > 0, expectMobile);
    },
    vp,
  )),

  // ── The mobile-only entry editor ──────────────────────────────────────────
  scenario('Mobile sweep: entry detail panel', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    await openEntryDetail(page, 0);
    check('tapping a card opens the detail panel', await page.locator('.entry-detail-panel--open').count(), 1);
    await sweepPose('detail panel', { scope: '.entry-detail-panel--open' });

    await closeEntryDetail(page);
    check('Back closes the detail panel', await page.locator('.entry-detail-panel--open').count(), 0);
  }),

  // ── Filtering and search ──────────────────────────────────────────────────
  scenario('Mobile sweep: filter popover and search dropdown', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    await openFilterPopover(page);
    check('the Filter popover opens', await page.locator('.type-filter-popover').count(), 1);
    await sweepPose('filter popover', { scope: '.type-filter-popover' });
    await dismissPopover(page);

    // A query matching many entries — the dropdown is the tallest transient
    // layer on mobile and the one most likely to run past the fold.
    await page.locator('.search-input').first().fill('a');
    await settle(page, 500);
    await sweepPose('search dropdown', { scope: '.search-dropdown' });
  }),

  // ── Select mode and the bulk bar ──────────────────────────────────────────
  scenario('Mobile sweep: select mode and bulk action bar', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    await enterSelectMode(page);
    await sweepPose('select mode, nothing selected');

    await selectCards(page, '.build-panel', [0, 1, 2]);
    check('three cards select', await page.locator('.entry-card--selected').count(), 3);
    await sweepPose('select mode, bulk bar active');
  }),

  // ── Menus, settings and the import/export surfaces ────────────────────────
  scenario('Mobile sweep: settings panel', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    // Scoped to the panel: on mobile it is a full-screen overlay, so the builder
    // controls behind it are covered by design and would otherwise every one of
    // them report as occluded.
    await openSettings(page);
    await sweepPose('settings panel, all collapsed', { scope: '.menu-panel' });

    for (const section of ['Layout & Controls', 'Appearance']) {
      await openSettingsSection(page, section);
      await settle(page, 200);
      await sweepPose(`settings — ${section}`, { scope: '.menu-panel' });
    }
  }),

  scenario('Mobile sweep: import and export surfaces', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    await tap(page, page.locator('.hotbar').locator('button', { hasText: 'Export' }).first());
    await page.locator('.export-menu').waitFor({ timeout: 4000 });
    await sweepPose('export menu', { scope: '.export-menu' });
    await dismissPopover(page);

    await tap(page, page.locator('.hotbar').locator('button', { hasText: 'Import' }).first());
    await page.locator('.append-import-panel').waitFor({ timeout: 4000 });
    await sweepPose('import panel', { scope: '.append-import-panel' });
  }),

  // ── The mobile-only crosstalk surfaces ────────────────────────────────────
  //
  // Deliberately still pairs at desktop width and then shrinks, even though
  // 14B made pairing reachable on a phone (see `pairCrosstalkMobile`, and the
  // #123 scenario below). This is the pose that arrives at the mobile crosstalk
  // surface *through* a live breakpoint crossing rather than starting there,
  // which is the only thing exercising `useMobile`'s bare `resize` listener
  // against a book that is already paired.
  scenario('Mobile sweep: reference sheet and entry overlay', async (page, check, sweepPose, quirk) => {
    await pairCrosstalk(page);
    await settle(page, 400);

    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page, 600);
    check('the layout crosses to mobile on resize', await page.locator('.entry-card--mobile').count() > 0, true);
    await sweepPose('crosstalk paired, after resize');

    // Browse reference → the mobile-only sheet.
    const refMenuBtn = page.locator('.role-swap-segment-action').last();
    if (await refMenuBtn.count()) {
      await tap(page, refMenuBtn);
      await settle(page, 300);
      const browse = page.locator('.role-swap-ref-menu-item', { hasText: 'Browse reference' });
      if (await browse.count()) {
        await tap(page, browse.first());
        await page.locator('.reference-browse-sheet').waitFor({ timeout: 4000 });
        await sweepPose('reference browse sheet', { scope: '.reference-browse-sheet' });

        // Tapping a row in the sheet opens the read-only entry overlay.
        const row = page.locator('.reference-browse-sheet .entry-card').first();
        if (await row.count()) {
          await tap(page, row);
          await settle(page, 400);
          quirk('tapping a browse-sheet row opens the reference entry overlay',
            await page.locator('.reference-entry-overlay').count(), 1);
          if (await page.locator('.reference-entry-overlay').count()) {
            await sweepPose('reference entry overlay', { scope: '.reference-entry-overlay' });
          }
        }
      }
    }
  }, { mobile: true, width: 1280, height: 900 }),

  // ── Long-press: the FAB quick menu ────────────────────────────────────────
  scenario('Mobile: FAB long-press opens the quick menu', async (page, check, sweepPose, quirk) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    const before = await page.locator('.entry-card').count();
    await longPress(page, page.locator('.footer-fab'));
    check('long-press opens the quick menu', await page.locator('.fab-quick-menu').count(), 1);
    check('and suppresses the tap that would have added an entry',
      await page.locator('.entry-card').count(), before);
    await sweepPose('FAB quick menu', { scope: '.fab-quick-menu' });

    // Every other transient layer in the app closes on Escape.
    await page.keyboard.press('Escape');
    await settle(page, 300);
    quirk('Escape closes the FAB quick menu', await page.locator('.fab-quick-menu').count(), 0);
  }),

  scenario('Mobile: a short tap on the FAB adds an entry', async (page, check) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    const before = await page.locator('.entry-card').count();
    await tap(page, page.locator('.footer-fab'));
    await settle(page, 400);
    check('a tap adds one entry', await page.locator('.entry-card').count(), before + 1);
    check('and does not open the quick menu', await page.locator('.fab-quick-menu').count(), 0);
    check('and opens the new entry for editing', await page.locator('.entry-detail-panel--open').count(), 1);
  }),

  // ── The system Back gesture against a full-screen layer ───────────────────
  //
  // This is the dismissal question that actually matters on a phone. There is no
  // pushState/popstate anywhere in src/, so opening a full-screen layer adds no
  // history entry — and Back, the gesture a phone user reaches for to close a
  // full-screen view, leaves the site instead. With the entry editor open, that
  // is a swipe away from the work.
  //
  // Deferred 2026-08-11 — to revisit, not dropped. These stay written as the
  // intent rather than as today's output: asserting the current behaviour would
  // pin it as correct and the eventual fix would have to delete the assertion.
  // As quirks they cost nothing and flag the day the behaviour moves.
  scenario('Mobile: the Back gesture against the entry editor', async (page, check, sweepPose, quirk) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    const before = await page.evaluate(() => history.length);
    await openEntryDetail(page, 0);
    const after = await page.evaluate(() => history.length);

    quirk('opening the entry editor pushes a history entry to catch Back', after > before, true);

    // Then the consequence, stated rather than inferred. Last in the scenario
    // because navigating away ends the page.
    const url = page.url();
    await page.goBack({ waitUntil: 'load' }).catch(() => {});
    await settle(page, 400);
    quirk('Back closes the editor rather than leaving the app', page.url(), url);
  }),

  // ── Which layers the Escape stack actually reaches ────────────────────────
  //
  // Scoped: Escape is not a gesture a phone has. This matters for a desktop
  // browser window narrower than 768px — which renders this same UI — and for a
  // tablet with a keyboard. It is not a finding about phone users, and the
  // dismiss stack is Escape-only (services/dismiss-stack.js), so not registering
  // costs a phone nothing. Kept because the narrow-window case is real and the
  // fix is one hook call per layer.
  scenario('Mobile: Escape closes the transient layers', async (page, check, sweepPose, quirk) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    await openFilterPopover(page);
    await page.keyboard.press('Escape');
    await settle(page, 300);
    quirk('Escape closes the Filter popover', await page.locator('.type-filter-popover').count(), 0);
    await dismissPopover(page);

    await openEntryDetail(page, 0);
    await page.keyboard.press('Escape');
    await settle(page, 300);
    quirk('Escape closes the entry detail panel', await page.locator('.entry-detail-panel--open').count(), 0);
    // Escape leaves it open, and it covers the whole screen including the header
    // gear — so it has to come down the supported way before the next layer.
    if (await page.locator('.entry-detail-panel--open').count()) await closeEntryDetail(page);

    await openSettings(page);
    await page.locator('.menu-panel--expanded').waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await settle(page, 400);
    quirk('Escape closes the Settings panel', await page.locator('.menu-panel--expanded').count(), 0);
  }),

  // ── A layer left open while the viewport crosses the breakpoint ───────────
  //
  // The panel is a 320px column beside the builder on desktop and a full-screen
  // overlay below the breakpoint, and nothing reconciles the two when the
  // viewport crosses — which is a phone rotating, or a desktop window being
  // dragged narrow.
  // Written in 14A to record the *old* behaviour — the panel stayed open and
  // silently became a full-screen takeover. 14B decision 4 closes every layer
  // at the crossing, so the assertion inverts: what this now pins is that the
  // builder is left usable, and specifically that it is not left under a
  // panel the user never asked to open. The behavioural half of the rule
  // (both directions, from a phone start) is the "crossing the breakpoint
  // closes whatever was open" scenario further down; this one keeps the sweep
  // of what the builder looks like on the far side.
  scenario('Mobile: settings panel open across the breakpoint', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);
    await openSettings(page);
    await page.locator('.menu-panel--expanded').waitFor({ timeout: 4000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page, 700);

    check('the panel closes on crossing to mobile',
      await page.locator('.menu-panel--expanded').count(), 0);
    check('and the builder is what is left',
      await page.locator('.entry-card--mobile').count() > 0, true);
    await sweepPose('builder after crossing the breakpoint with a panel open');
  }, { mobile: true, width: 1280, height: 900 }),

  // ── A desktop window size carried into a phone viewport ───────────────────
  //
  // The window geometry persists across sessions, so a user who last opened the
  // builder on a desktop arrives on their phone with a 1200x900 window in
  // storage. Nothing clears it at the breakpoint.
  scenario('Mobile sweep: desktop window state restored on a phone', async (page, check, sweepPose) => {
    await seedStorage(page, {
      mkp_window_state: { pos: { x: 320, y: 120 }, size: { width: 1200, height: 900 } },
    });
    await openBuilderWithFixture(page);
    await settle(page, 500);
    await sweepPose('phone with desktop window state');
  }),

  // ── Mobile-specific behaviour ─────────────────────────────────────────────

  scenario('Mobile: the Filter popover filters, and its badge counts', async (page, check) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);
    const total = await page.locator('.entry-card').count();

    await openFilterPopover(page);
    // Pick a concrete type rather than "All types", which is the clear-filter row.
    await tap(page, page.locator('.type-filter-popover-row', { hasText: 'Location' }).first());
    await settle(page, 400);

    const filtered = await page.locator('.entry-card').count();
    check('choosing a type narrows the list', filtered < total && filtered > 0, true);
    check('and the button badge reports one active filter',
      (await page.locator('.type-filter-button').innerText()).includes('(1)'), true);
  }),

  // Reported as #124: the scope popover was an absolutely-positioned child of
  // `.replace-btn-wrap` with `right: 0`, which put it at left −211 on a 390px
  // phone — and every ancestor up to #root is `overflow: hidden`, so the missing
  // 211px was clipped rather than scrollable. It is portalled and anchored now.
  //
  // The Replace *apply* path had no coverage at all before this, on either
  // viewport, which is a poor thing to leave untested for an action that rewrites
  // text across a whole book. Hence the second half.
  scenario('Mobile: the Replace scope popover fits on screen, and replaces', async (page, check) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    await page.locator('.search-mode-select').first().selectOption('find-replace');
    await settle(page, 300);
    await page.locator('.find-input').first().fill('Reika');
    await page.locator('.replace-input').first().fill('Zephyr');
    await settle(page, 300);

    await tap(page, page.locator('.replace-all-btn').first());
    await page.locator('.replace-scope-popover').waitFor({ timeout: 4000 });

    const box = await page.locator('.replace-scope-popover').boundingBox();
    const width = page.viewportSize().width;
    check('the popover starts on screen', box.x >= 0, true);
    check('and ends on screen',           box.x + box.width <= width, true);

    // Proceed applies to the active book. The count in the button is the number
    // of matches, so a successful replace has to take it to zero.
    await tap(page, page.locator('.replace-scope-proceed').first());
    await settle(page, 600);
    check('replacing leaves no matches for the old text',
      (await page.locator('.replace-all-btn').first().innerText()).includes('(0)'), true);
    check('and the new text is in the book',
      await page.evaluate(() => document.body.innerText.includes('Zephyr')), true);
  }),

  // ── The 14B navigation spine ───────────────────────────────────────────
  //
  // These four pin the destinations a phone had no route to before 14B. The
  // 14A sweep could not have caught any of them: it tested what was reachable,
  // and the defect was that these were not.

  scenario('Mobile: the title menu reaches lorebooks and import/export', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page);
    await importBookAsNew(page, VARIANT_FIXTURE);
    await settle(page, 400);

    // The door is the lorebook name. Nothing else on a phone leads here.
    check('the lorebook name is a control in the header',
      await page.locator('.window-header .title-field--mobile').count(), 1);
    await openMobileTitleMenu(page);
    check('the menu opens', await page.locator('.mtm').count(), 1);
    check('it carries both destinations', await page.locator('.mtm-tab').count(), 2);
    check('and lists every saved book', await page.locator('.mtm-row').count(), 2);

    // It is a full-screen surface, so nothing may hang off the edge of it.
    const box = await page.locator('.mtm').boundingBox();
    const vp  = page.viewportSize();
    check('it fills the viewport width', box.width, vp.width);
    check('and does not overhang it',    box.x >= 0 && box.x + box.width <= vp.width, true);

    // The FAB floats above the hotbar and would otherwise sit on top of this.
    check('the FAB is out of the way', await page.locator('.fab').first().isVisible(), false);
    await sweepPose('mobile title menu, lorebooks tab');

    await openMobileTitleMenu(page, 'Import');
    check('the import tab has a paste button, not a link',
      await page.locator('.mtm .import-flow-swap--paste').count(), 1);
    // Decision 11: the gap is the whole point — as a link sharing an edge with
    // the drop zone, a near-miss opened the OS file picker.
    const paste = await page.locator('.mtm .import-flow-swap--paste').boundingBox();
    const drop  = await page.locator('.mtm .drop-zone').first().boundingBox();
    check('paste clears the drop zone', paste.y > drop.y + drop.height, true);
    check('and is at the touch floor',  paste.height >= 44, true);
    await sweepPose('mobile title menu, import tab');
  }),

  scenario('Mobile: pairing a reference from the title menu (#123)', async (page, check, sweepPose) => {
    // The root of #123: before 14B a phone could turn the feature on in
    // Settings and nothing whatsoever would change, because the only picker in
    // the app lived in a panel mobile had no route to.
    const { referenceName } = await pairCrosstalkMobile(page);
    check('pairing produces the two-segment role bar',
      await page.locator('.role-swap-segment').count(), 2);
    check('and names the book that was paired',
      (await page.locator('.role-swap-segmented').innerText()).includes(referenceName), true);

    // Reopening shows the pairing as state, not just as an effect elsewhere.
    await openMobileTitleMenu(page);
    check('the paired book is badged in the list', await page.locator('.mtm-row-badge').count(), 1);
    await sweepPose('mobile title menu with a paired reference');

    // The footer button opens the one chooser, and it explains itself.
    await tap(page, page.locator('.mtm-foot-btn--ref').first());
    await page.locator('.ref-chooser').waitFor({ timeout: 4000 });
    check('the chooser says what a reference lorebook is',
      (await page.locator('.ref-chooser-blurb').innerText()).length > 40, true);
    check('and shows what is currently paired', await page.locator('.ref-chooser-current').count(), 1);
    const cbox = await page.locator('.ref-chooser').boundingBox();
    const vp   = page.viewportSize();
    check('the chooser fits on screen',
      cbox.x >= 0 && cbox.x + cbox.width <= vp.width, true);
    await sweepPose('reference chooser');

    // Unpairing is the only "off" there is — decision 9 removed the toggle, so
    // this is what has to take the crosstalk UI away.
    await tap(page, page.locator('.ref-chooser-btn--unpair').first());
    await settle(page, 500);
    check('unpairing ends crosstalk',   await page.locator('.role-swap-segment').count(), 0);
    check('and puts the title back in the header',
      await page.locator('.window-header .title-field--mobile').count(), 1);
  }),

  scenario('Mobile: create, rename and delete a book that is not the active one', async (page, check) => {
    await openBuilderWithFixture(page);
    await importBookAsNew(page, VARIANT_FIXTURE);
    await settle(page, 400);

    await openMobileTitleMenu(page);
    const before = await page.locator('.mtm-row').count();

    // Create. A new book prompts for its name, so that has to be answered
    // before the title menu is reachable again — the modal is the app's own
    // behaviour, not something in the way.
    await tap(page, page.locator('.mtm-foot-btn--new').first());
    await page.locator('.lb-name-modal-input').waitFor({ timeout: 4000 });
    await page.locator('.lb-name-modal-input').fill('Made By Test');
    await page.locator('.lb-name-modal-input').press('Enter');
    await settle(page, 500);
    await openMobileTitleMenu(page);
    check('＋ New adds a lorebook', await page.locator('.mtm-row').count(), before + 1);

    // Rename a *non-active* book — the case that had no route at all before.
    const target = page.locator('.mtm-row-wrap').filter({ hasNot: page.locator('.mtm-row--active') }).first();
    await tap(page, target.locator('.mtm-row-menu-btn').first());
    await settle(page, 150);
    await tap(page, target.locator('.mtm-row-menu-item', { hasText: 'Rename' }).first());
    await settle(page, 200);
    await page.locator('.mtm-rename-input').first().fill('Renamed By Test');
    await page.locator('.mtm-rename-input').first().press('Enter');
    await settle(page, 400);
    check('a non-active book can be renamed',
      (await page.locator('.mtm-body').innerText()).includes('Renamed By Test'), true);

    // Delete it again.
    const renamed = page.locator('.mtm-row-wrap').filter({ hasText: 'Renamed By Test' }).first();
    await tap(page, renamed.locator('.mtm-row-menu-btn').first());
    await settle(page, 150);
    await tap(page, renamed.locator('.mtm-row-menu-item', { hasText: 'Delete' }).first());
    await settle(page, 200);
    check('deleting asks first', await page.locator('.mtm-confirm').count(), 1);
    await tap(page, page.locator('.mtm-confirm-btn--danger').first());
    await settle(page, 500);
    check('and then deletes', await page.locator('.mtm-row').count(), before);
  }),

  scenario('Mobile: Settings carries the only route back to the lander', async (page, check) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);
    check('the builder is showing', await page.locator('.lander').count(), 0);

    await tap(page, page.locator('.menu-btn--gear').first());
    await settle(page, 400);
    check('Settings offers the route', await page.locator('.settings-lander-btn').count(), 1);

    await tap(page, page.locator('.settings-lander-btn').first());
    await settle(page, 600);
    check('it returns to the lander', await page.locator('.lander').count(), 1);
    // Leaving Settings open would land the user back in it on re-entry.
    check('and closes the panel behind it',
      await page.locator('.menu-panel--expanded').count(), 0);
  }),

  scenario('Mobile: crossing the breakpoint closes whatever was open', async (page, check) => {
    // Decision 4. The settings panel is a 320px column above the breakpoint and
    // a full-screen overlay below it, and nothing reconciles the two mid-drag —
    // so a desktop window dragged narrow used to produce a takeover the user
    // never asked for.
    await openBuilderWithFixture(page);
    await settle(page, 400);
    await tap(page, page.locator('.menu-btn--gear').first());
    await settle(page, 400);
    check('a layer is open at phone width', await page.locator('.menu-panel--expanded').count(), 1);

    await page.setViewportSize({ width: 1280, height: 900 });
    await settle(page, 600);
    check('crossing up closes it', await page.locator('.menu-panel--expanded').count(), 0);

    // And back the other way, which is the direction the sweep found.
    await page.locator('.menu-btn--gear').first().click();
    await settle(page, 400);
    check('a layer is open at desktop width', await page.locator('.menu-panel--expanded').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page, 600);
    check('crossing down closes it too', await page.locator('.menu-panel--expanded').count(), 0);
  }),

  scenario('Mobile: reordering by drag is disabled', async (page, check) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);
    // EntryList sets dragDisabled on mobile, so the handles should not be
    // draggable at all — a half-working drag is worse than none.
    const draggable = await page.locator('.entry-card--mobile [draggable="true"]').count();
    check('no mobile card exposes a drag handle', draggable, 0);
  }),

  scenario('Mobile: the menu overlay closes after an import', async (page, check) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);

    await tap(page, page.locator('.hotbar').locator('button', { hasText: 'Import' }).first());
    await page.locator('.append-import-panel').waitFor({ timeout: 4000 });
    await page.locator('.append-import-panel .drop-zone input[type="file"]').setInputFiles(stressBook('maxed-entry'));
    await page.locator('.import-flow-grid').waitFor({ timeout: 6000 });
    await page.locator('.import-flow-opt', { hasText: 'Import as new' }).click();
    await page.locator('.import-flow-confirm').click();
    await settle(page, 800);

    // On mobile the menu is a full-screen overlay, so it always closes after a
    // successful import regardless of the keep-open setting.
    check('the import panel closes', await page.locator('.append-import-panel').count(), 0);
    check('and the menu overlay is not left covering the builder',
      await page.locator('.menu-panel--expanded').count(), 0);
  }),

  // ── Stress: the app's own limits, on the narrowest screen ─────────────────

  scenario('Mobile stress: one entry at every limit', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page, stressBook('maxed-entry'));
    await settle(page, 500);
    await sweepPose('list with one maxed entry');

    await openEntryDetail(page, 0);
    check('all 25 trigger chips render',
      await page.locator('.entry-detail-panel--open .chip').count(), LIMITS.MAX_TRIGGERS);
    const desc = await page.locator('.entry-detail-panel--open textarea').first().inputValue();
    check('the description arrives at the character cap', desc.length, LIMITS.CHAR_LIMIT);
    await sweepPose('detail panel at every limit', { scope: '.entry-detail-panel--open' });
  }),

  scenario('Mobile stress: 500 entries', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page, stressBook('bulk'));
    await settle(page, 800);
    check('every entry imports', await page.locator('.entry-card').count(), 500);
    await sweepPose('500-entry list, at the top');

    // The list has to still be usable at the far end, not just the near one.
    await page.locator('.entry-list').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await settle(page, 400);
    await sweepPose('500-entry list, scrolled to the bottom');
  }),

  scenario('Mobile stress: names far past the title cap', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page, stressBook('long-names'));
    await settle(page, 500);
    // 240-character names in a 390px row: either they ellipsize, or they push
    // the chevron and stats out of the row. The clipped-text and offscreen rules
    // are what tell the two apart.
    await sweepPose('list of 240-character names');

    // The row currently holds its shape — one line, ellipsised, chevron intact.
    // Pinned because it is the behaviour a redesign is most likely to lose.
    const row = await page.locator('.entry-card--mobile').first().evaluate((card) => {
      const name = card.querySelector('.entry-card-mobile-name');
      const chevron = card.querySelector('.entry-card-mobile-chevron');
      return {
        height: Math.round(card.getBoundingClientRect().height),
        ellipsised: getComputedStyle(name).textOverflow === 'ellipsis'
                 && getComputedStyle(name).whiteSpace === 'nowrap',
        chevronVisible: chevron ? chevron.getBoundingClientRect().width > 0 : false,
      };
    });
    check('a 240-character name still fits one row', row.height < 120, true);
    check('and is ellipsised rather than wrapped', row.ellipsised, true);
    check('and does not push the chevron out of the row', row.chevronVisible, true);

    await page.locator('.search-input').first().fill('#1');
    await settle(page, 500);
    await sweepPose('search dropdown with long names', { scope: '.search-dropdown' });
  }),

  scenario('Mobile stress: every entry maxed', async (page, check, sweepPose) => {
    await openBuilderWithFixture(page, stressBook('maxed-many'));
    await settle(page, 800);
    await sweepPose('40 maxed entries');

    await enterSelectMode(page);
    await selectCards(page, '.build-panel', [0, 1]);
    await sweepPose('select mode over maxed entries');
  }),
];

export async function runMobileChecks(only = '') {
  const filters = only.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const selected = filters.length
    ? SCENARIOS.filter((s) => filters.some((f) => s.name.toLowerCase().includes(f)))
    : SCENARIOS;

  if (selected.length === 0) return true;

  const outcomes = [];
  const allNotes = [];
  for (const s of selected) {
    const { ok, notes } = await runScenario(s);
    outcomes.push(ok);
    allNotes.push(...notes);
  }

  const passed = outcomes.filter(Boolean).length;
  console.log(`\nMobile: ${passed}/${outcomes.length} scenarios passed, ${allNotes.length} notes`);

  // The note roll-up is the point of the suite, so it gets a summary rather
  // than being left scattered through the log.
  if (allNotes.length) {
    const byRule = new Map();
    for (const n of allNotes) byRule.set(n.rule, (byRule.get(n.rule) ?? 0) + 1);
    const summary = [...byRule.entries()].sort((a, b) => b[1] - a[1]).map(([rule, count]) => `${rule} ${count}`);
    console.log(`Notes by rule: ${summary.join(', ')}`);
  }

  return outcomes.every(Boolean);
}

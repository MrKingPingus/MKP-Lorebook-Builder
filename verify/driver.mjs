// Reusable Playwright driver for the MKP Lorebook Builder dev server.
//
// This encodes the builder's navigation pathways so verification scripts (and
// future sessions) don't have to re-derive them each time:
//   - lander -> builder, dismissing the "Name your lorebook" modal (Enter)
//   - importing a fixture book (Import File tile -> mode -> "Import N entries")
//   - entering Select mode
//   - capturing a JSON export via the hotbar Export button
//   - opening the Settings panel from the header ☰ menu
//
// Browser resolution is deliberately robust so this runs in the remote
// container (pre-installed Chromium under PLAYWRIGHT_BROWSERS_PATH), in CI, or
// on a local machine (Playwright's own downloaded browser):
//   1. $PW_CHROMIUM_PATH if set and present
//   2. a chromium-*/chrome-linux/chrome under $PLAYWRIGHT_BROWSERS_PATH
//   3. undefined -> Playwright's managed browser (run `npx playwright install`)
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BASE_URL = process.env.VERIFY_URL || 'http://localhost:5173/';
export const FIXTURE = fileURLToPath(new URL('../fixtures/reika-test-book.json', import.meta.url));
// Second book for crosstalk/reference checks. Derived from FIXTURE by
// fixtures/build-variant-book.mjs, which documents every deliberate difference
// and exports the expected counts.
export const VARIANT_FIXTURE = fileURLToPath(new URL('../fixtures/reika-test-book-variant.json', import.meta.url));

function resolveChromium() {
  if (process.env.PW_CHROMIUM_PATH && existsSync(process.env.PW_CHROMIUM_PATH)) {
    return process.env.PW_CHROMIUM_PATH;
  }
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base && existsSync(base)) {
    const dirs = readdirSync(base)
      .filter((d) => d.startsWith('chromium-') && !d.includes('headless'))
      .sort(); // deterministic; any full chromium build works since we launch it directly
    for (const d of dirs) {
      const p = join(base, d, 'chrome-linux', 'chrome');
      if (existsSync(p)) return p;
    }
  }
  return undefined; // let Playwright use its managed browser
}

export async function launch({ width = 1280, height = 900, mobile = false, deviceScaleFactor } = {}) {
  const browser = await chromium.launch({ headless: true, executablePath: resolveChromium() });
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: mobile, hasTouch: mobile,
    deviceScaleFactor: deviceScaleFactor ?? (mobile ? 2 : 1),
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('  PAGEERROR', e.message));
  return { browser, page };
}

// Load a fixture JSON as a fresh lorebook via the lander "Import File" tile.
// The tile opens the OS file picker and imports the chosen file directly — no
// import-panel disposition prompts and no "Name your lorebook" modal. Leaves
// the builder open with entry cards rendered. Returns the card count.
export async function openBuilderWithFixture(page, fixturePath = FIXTURE) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await settle(page, 300);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.lander-tile', { hasText: 'Import File' }).click(),
  ]);
  await chooser.setFiles(fixturePath);
  await page.locator('.entry-card').first().waitFor({ timeout: 8000 });
  return page.locator('.entry-card').count();
}

// Import a second lorebook from a file, as a NEW book rather than appending.
// Note importAsNewLorebook makes the imported book the active one.
export async function importBookAsNew(page, fixturePath) {
  await page.locator('.hotbar').locator('button', { hasText: 'Import' }).first().click();
  await page.locator('.append-import-panel').waitFor({ timeout: 4000 });
  // 13C put every surface on the shared import flow: drop a file, pick a
  // disposition, confirm. The old segmented mode control is gone.
  await page.locator('.append-import-panel .drop-zone input[type="file"]').setInputFiles(fixturePath);
  await page.locator('.import-flow-grid').waitFor({ timeout: 6000 });
  await page.locator('.import-flow-opt', { hasText: 'Import as new' }).click();
  await page.locator('.import-flow-confirm').waitFor({ timeout: 4000 });
  await page.locator('.import-flow-confirm').click();
  await page.locator('.append-import-panel').waitFor({ state: 'detached', timeout: 4000 });
}

// Put the app into paired crosstalk mode: FIXTURE active on the left, the
// derived VARIANT_FIXTURE as the read-only reference on the right.
//
// The variant is loaded FIRST because importing a book as new makes it active —
// so importing the primary second leaves the primary active, which is the
// arrangement every crosstalk scenario wants. Returns the two book names.
export async function pairCrosstalk(page) {
  await openBuilderWithFixture(page, VARIANT_FIXTURE);
  await importBookAsNew(page, FIXTURE);

  // Turn on the reference panel. Settings is an accordion and collapsed
  // sections don't render their children, so the section has to be opened
  // before its controls exist in the DOM.
  await openSettings(page);
  await openSettingsSection(page, 'Layout & Controls');
  const toggle = page.locator('label:has-text("Show reference panel") input[type="checkbox"]');
  await toggle.waitFor({ timeout: 4000 });
  await toggle.check();

  // Close via the panel's own close button, and wait for it. Escape does *not*
  // close the settings panel — the mobile sweep caught this — so the Escape that
  // used to stand here left the panel open for the rest of the pose. Harmless on
  // desktop, where the panel sits beside the builder, but below the breakpoint
  // the same panel is a full-screen overlay covering everything under test.
  await page.locator('.menu-panel-close').first().click();
  await page.locator('.menu-panel--expanded').waitFor({ state: 'detached', timeout: 4000 });
  await page.locator('.reference-panel').waitFor({ timeout: 4000 });

  // Pick the variant as the reference. The picker excludes the active book, so
  // the only remaining option is the one we want.
  const picker = page.locator('.reference-panel .pane-header-picker');
  const options = await picker.locator('option').evaluateAll(
    (els) => els.map((e) => ({ value: e.value, label: e.textContent.trim() })).filter((o) => o.value)
  );
  if (options.length === 0) throw new Error('No reference lorebook options available');
  await picker.selectOption(options[0].value);
  await page.locator('.reference-panel-entries').waitFor({ timeout: 4000 });

  const activeName = await page.locator('.build-panel .pane-header-picker').inputValue().catch(() => null);
  return { activeName, referenceName: options[0].label };
}

// Expand a Settings accordion section by its visible title. Collapsed sections
// render no children at all, so this is a prerequisite for touching anything
// inside one. No-op if it's already open.
// Returns a locator SCOPED to that section, because several sections can be
// open at once — an unscoped `.settings-select` reaches into whichever one
// happens to come first in the DOM.
export async function openSettingsSection(page, title) {
  const section = page.locator('.settings-section', {
    has: page.locator('.settings-section-title', { hasText: title }),
  }).first();
  await section.waitFor({ timeout: 4000 });
  const header = section.locator('.settings-section-header').first();
  if ((await header.getAttribute('aria-expanded')) !== 'true') {
    await header.click();
    await settle(page, 150);
  }
  return section;
}

// Open the status footer's ⤢ Size menu (desktop only). No-op if already open.
// Phase 13A moved window size, entry header height and FAB size out of Settings
// and into this menu, so scenarios that used to drive a Settings <select> for
// any of those come through here instead.
export async function openScaleMenu(page) {
  if ((await page.locator('.scale-menu').count()) > 0) return;
  await page.locator('.status-footer .status-item').first().click();
  await page.locator('.scale-menu').waitFor({ timeout: 4000 });
}

// Pick a value from one of the ⤢ Size menu's flyouts, e.g.
//   setScaleOption(page, 'Entry header', 'Large')
//
// `rowLabel` is matched against the four flyout-bearing rows only — the
// "Reset all sizing" row carries a note reading "Text size kept", so an
// unqualified hasText match on "Text size" hits two rows.
export async function setScaleOption(page, rowLabel, optionLabel) {
  await openScaleMenu(page);
  await page.locator('.scale-row[aria-haspopup]', { hasText: rowLabel }).hover();
  await page.locator('.scale-flyout').waitFor({ timeout: 4000 });
  await settle(page, 120);
  await page.locator('.scale-flyout .flyout-item', { hasText: optionLabel }).first().click();
  await settle(page, 250);
}

// Close the ⤢ Size menu the way a user would.
export async function closeScaleMenu(page) {
  if ((await page.locator('.scale-menu').count()) === 0) return;
  await page.keyboard.press('Escape');
  await settle(page, 200);
}

// Click entry cards to select them, in select mode.
//
// Always clicks the card's `.entry-label`, never the card's own centre: in
// select mode the header also carries a type-change dropdown that calls
// stopPropagation, and in a narrow crosstalk pane that dropdown sits right
// under the card's midpoint, so a centre-click silently selects nothing.
//
// The mobile card is a different component with different internals — there is
// no `.entry-label` on it at all — so the label target is chosen per viewport.
export async function selectCards(page, containerSelector, indices) {
  const label = isMobileViewport(page) ? '.entry-card-mobile-name' : '.entry-label';
  for (const i of indices) {
    await page.locator(`${containerSelector} .entry-card`).nth(i).locator(label).first().click();
    await settle(page, 80);
  }
  await settle(page, 120);
}

// ── Mobile ───────────────────────────────────────────────────────────────────
// The mobile layout is not a reflow of the desktop one: roughly a third of the
// component tree branches on `useMobile()`, and two components
// (ReferenceBrowseSheet, ReferenceEntryOverlay) exist only here. The pathways
// below are the mobile equivalents of the desktop ones above.

// The app's own breakpoint, from src/hooks/use-mobile.js. Kept in sync by hand;
// there is no import path from verify/ into src/ constants.
export const MOBILE_BREAKPOINT = 768;

export function isMobileViewport(page) {
  return (page.viewportSize()?.width ?? Infinity) < MOBILE_BREAKPOINT;
}

// Touch dispatch goes through a CDP session per page, and that session must have
// touch emulation switched on explicitly — `Input.dispatchTouchEvent` is
// silently dropped without it, which looks exactly like the app ignoring the
// gesture. Playwright's own `hasTouch` context flag does not cover our session.
const touchSessions = new WeakMap();

async function touchSession(page) {
  let session = touchSessions.get(page);
  if (!session) {
    session = await page.context().newCDPSession(page);
    await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    touchSessions.set(page, session);
  }
  return session;
}

// Hold a touch on an element long enough to trip the app's long-press threshold
// (THESAURUS_LONG_PRESS_MS, 450ms). Produces the real event sequence a phone
// does — pointerdown/touchstart … pointerup/touchend/click, all with
// pointerType 'touch' — which matters because the long-press handlers deliberately
// suppress the trailing click, and a mouse-based fake would not prove that works.
export async function longPress(page, locator, ms = 700) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('longPress: target not visible');
  const session = await touchSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1, radiusX: 12, radiusY: 12, force: 1 }],
  });
  await settle(page, ms);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settle(page, 250);
}

// A real touch tap, as opposed to a synthetic click.
export async function tap(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('tap: target not visible');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await settle(page, 250);
}

// Open an entry's mobile detail panel by list position.
//
// `.entry-detail-panel` is always mounted — only the `--open` modifier says
// whether it is actually showing — so anything checking for it must look for the
// modifier, not the element.
export async function openEntryDetail(page, index = 0) {
  await tap(page, page.locator('.entry-card').nth(index));
  await page.locator('.entry-detail-panel--open').waitFor({ timeout: 4000 });
}

export async function closeEntryDetail(page) {
  await tap(page, page.locator('.entry-detail-back'));
  await page.locator('.entry-detail-panel--open').waitFor({ state: 'detached', timeout: 4000 });
}

export function detailOpen(page) {
  return page.locator('.entry-detail-panel--open').count().then((n) => n > 0);
}

// Open the mobile "Filter ▾" popover — the type pills, Group-by-type and the
// folder filter are all collapsed into it below the breakpoint.
export async function openFilterPopover(page) {
  await tap(page, page.locator('.type-filter-button'));
  await page.locator('.type-filter-popover').waitFor({ timeout: 4000 });
}

// Move the pointer somewhere harmless.
//
// A real phone has no hover, but Playwright's mouse stays wherever the last
// click left it, and at desktop widths that can sit over a hover-activated
// surface — the FAB quick menu opens this way — so a sweep would report a layer
// no user could have opened.
export async function parkMouse(page) {
  await page.mouse.move(1, 1);
  await settle(page, 350);
}

// Dismiss a popover the way the app expects: a pointerdown outside it. Note
// that Escape does not close every mobile layer, so this is not interchangeable
// with a keypress.
export async function dismissPopover(page) {
  await page.mouse.click(5, Math.round((page.viewportSize()?.height ?? 800) / 2));
  await settle(page, 250);
}

// Seed localStorage before the app boots, for poses that depend on prior state —
// notably a desktop-sized window persisted from a previous session then reopened
// on a phone. Must be called before the first navigation to BASE_URL.
export async function seedStorage(page, entries) {
  await page.addInitScript((pairs) => {
    for (const [k, v] of Object.entries(pairs)) {
      window.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, entries);
}

// Every fixed wait in the suite goes through here so there's one dial for all
// of them. A shared CI runner is slower and more variable than a dev machine,
// so VERIFY_WAIT_SCALE stretches them there instead of leaving the suite to
// discover on its own that 150ms wasn't enough. Locally the scale is 1, so
// nothing gets slower for day-to-day runs.
export const WAIT_SCALE = Number(process.env.VERIFY_WAIT_SCALE || (process.env.CI ? 3 : 1)) || 1;

export function settle(page, ms) {
  return page.waitForTimeout(Math.round(ms * WAIT_SCALE));
}

export async function enterSelectMode(page) {
  await page.locator('.search-mode-select').first().selectOption('select');
  await page.locator('.bulk-action-bar').first().waitFor({ timeout: 4000 });
}

// Export the active book as JSON via the hotbar Export button, capturing the
// download and returning the parsed CharSnap object. Works from any mode.
export async function exportJson(page) {
  await page.locator('.hotbar').locator('button', { hasText: 'Export' }).first().click();
  await page.locator('.export-menu').waitFor({ timeout: 3000 });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-menu-btn', { hasText: 'JSON' }).first().click(),
  ]);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}

export function countPrivate(book) {
  return Object.values(book.entries || {}).filter((e) => e.isPublic === false).length;
}

// Open the Settings panel via the header ☰ menu.
// 13C turned the header ☰ into a gear that opens Settings in one click. The
// legacy ☰ dropdown is still reachable behind a setting, so handle both: if the
// gear is present, click it; otherwise fall back to the two-step menu.
export async function openSettings(page) {
  const gear = page.locator('.menu-btn--gear');
  if (await gear.count()) {
    await gear.click();
    await settle(page, 300);
    return;
  }
  await page.locator('.menu-btn').click();
  await settle(page, 150);
  await page.getByText('Settings', { exact: true }).first().click();
  await settle(page, 300);
}

// Drive a native HTML5 drag. The app gates a drag on a mousedown over the drag
// handle (`isDragFromHandle`), so this has to press on the handle specifically
// rather than the row centre — and Chromium only synthesises dragstart once the
// pointer has actually moved a few pixels under a held button.
//
// `edge` picks which half of the destination row to release over, which is what
// decides before/after.
export async function dragTo(page, handleLocator, targetLocator, edge = 'before') {
  const from = await handleLocator.boundingBox();
  if (!from) throw new Error('dragTo: source not visible');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Nudge first: this crosses the drag threshold and starts the drag.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 });
  await settle(page, 250);

  // Measure the target only now, and only once the layout has settled. The
  // run-off zone below the list is 0px tall until a drag is in progress, so a
  // box taken before mousedown would be a zero-height strip the pointer could
  // never land on.
  const to = await targetLocator.boundingBox();
  if (!to) throw new Error('dragTo: target not visible');
  const y = edge === 'after' ? to.y + to.height * 0.8 : to.y + to.height * 0.2;
  const x = to.x + to.width / 2;

  await page.mouse.move(x, y, { steps: 12 });
  await settle(page, 300);
  await page.mouse.up();
  await settle(page, 250);
}

// Names of the entry rows as they currently render, top to bottom.
export async function rowNames(page, scope = '.build-panel') {
  const raw = await page.locator(`${scope} .entry-card .entry-label`).allInnerTexts();
  return raw.map((t) => t.replace(/^#\d+:\s*/, '').trim());
}

// Scroll the entry list to the bottom. The run-off drop zone lives under the
// last row, so any test aiming at it has to bring it into view first — a
// boundingBox below the fold gives coordinates the mouse can't reach.
export async function scrollListToBottom(page) {
  await page.locator('.entry-list').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await settle(page, 200);
}

// Turn the condensed collapse stage on. It is off by default now — a folder's
// header button cycles open-or-shut unless you ask for the middle step — so any
// scenario exercising condensed rows has to enable it first.
export async function enableCondensedStage(page) {
  await openSettings(page);
  const folders = await openSettingsSection(page, 'Layout & Controls');
  const condensed = folders.locator('.settings-checkbox-row input').nth(1);
  if (!(await condensed.isChecked())) {
    await condensed.check();
    await settle(page, 200);
  }
  await page.locator('.menu-panel-close').first().click();
  await settle(page, 300);
}

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
  await page.locator('.append-import-mode-btn', { hasText: 'Whole book from file' }).click();
  await page.locator('.append-file-picker input[type="file"]').setInputFiles(fixturePath);
  await page.locator('.import-save-btn--new').waitFor({ timeout: 6000 });
  await page.locator('.import-save-btn--new').click();
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
  await openSettingsSection(page, 'Reference & Crosstalk');
  const toggle = page.locator('label:has-text("Show reference panel") input[type="checkbox"]');
  await toggle.waitFor({ timeout: 4000 });
  await toggle.check();
  await page.keyboard.press('Escape');
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

// Click entry cards to select them, in select mode.
//
// Always clicks the card's `.entry-label`, never the card's own centre: in
// select mode the header also carries a type-change dropdown that calls
// stopPropagation, and in a narrow crosstalk pane that dropdown sits right
// under the card's midpoint, so a centre-click silently selects nothing.
export async function selectCards(page, containerSelector, indices) {
  for (const i of indices) {
    await page.locator(`${containerSelector} .entry-card`).nth(i).locator('.entry-label').first().click();
    await settle(page, 80);
  }
  await settle(page, 120);
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
export async function openSettings(page) {
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
  const folders = await openSettingsSection(page, 'Folders');
  const condensed = folders.locator('.settings-checkbox-row input').nth(1);
  if (!(await condensed.isChecked())) {
    await condensed.check();
    await settle(page, 200);
  }
  await page.locator('.menu-panel-close').first().click();
  await settle(page, 300);
}

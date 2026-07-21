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

export async function launch({ width = 1280, height = 900, mobile = false } = {}) {
  const browser = await chromium.launch({ headless: true, executablePath: resolveChromium() });
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('  PAGEERROR', e.message));
  return { browser, page };
}

// Dismiss the "Name your lorebook" modal if present (Enter = confirm/keep book).
async function dismissNameModal(page) {
  if (await page.locator('.lb-name-modal-overlay').count()) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
  }
}

// Load a fixture JSON as the active book via the lander "Import File" tile.
// Leaves the builder open with entry cards rendered. Returns the card count.
export async function openBuilderWithFixture(page, fixturePath = FIXTURE, { mode = 'Append to active' } = {}) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator('.lander-tile', { hasText: 'Import File' }).click();
  await page.waitForTimeout(250);
  await dismissNameModal(page);
  await page.locator('input[type="file"]').first().setInputFiles(fixturePath);
  // Import/Export panel: a backup/mode prompt, then a "Import N entries" confirm.
  const modeBtn = page.locator('.import-save-btn', { hasText: mode });
  await modeBtn.first().waitFor({ state: 'visible', timeout: 8000 });
  await modeBtn.first().click();
  const finalBtn = page.locator('button', { hasText: /Import \d+ entr/ });
  await finalBtn.first().waitFor({ state: 'visible', timeout: 6000 });
  await finalBtn.first().click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); // close the menu panel
  await page.waitForTimeout(300);
  await page.locator('.entry-card').first().waitFor({ timeout: 8000 });
  return page.locator('.entry-card').count();
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
  await page.waitForTimeout(150);
  await page.getByText('Settings', { exact: true }).first().click();
  await page.waitForTimeout(300);
}

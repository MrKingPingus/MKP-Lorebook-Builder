// Behavioural checks for host (embedded) mode, driven against the real dev
// server through a static host page — verify/host-harness/index.html.
//
// The harness is served by intercepting http://localhost:3000/** with
// page.route, so no second server is needed: the top frame is a page at an
// allowlisted origin, the iframe is the builder at BASE_URL with
// ?host=charsnap, and the two talk over postMessage exactly as CharSnap and
// the builder do. Every scenario name starts with "Host:" so
// `npm run verify -- host` runs this file alone.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch, settle, tap, BASE_URL } from './driver.mjs';

const HARNESS_ORIGIN = 'http://localhost:3000';
const HARNESS_URL    = `${HARNESS_ORIGIN}/host-harness/`;
const HARNESS_FILE   = fileURLToPath(new URL('./host-harness/index.html', import.meta.url));
const BUILDER_URL    = `${BASE_URL}${BASE_URL.includes('?') ? '&' : '?'}host=charsnap`;

// The harness page is fulfilled by page.route, so Chrome cannot place it in an
// address space and its Local Network Access checks (Chrome 138+) block the
// localhost iframe with ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS. Real
// deployments are unaffected (both pages are real network responses); the
// switch only tells this test browser what a real fetch would have told it.
const LAUNCH = { args: ['--disable-features=LocalNetworkAccessChecks'] };
const PHONE  = { ...LAUNCH, mobile: true, width: 390, height: 844 };

function scenario(name, fn, launchOptions = LAUNCH) {
  return { name, fn, launchOptions };
}

async function runScenario({ name, fn, launchOptions = {} }) {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };
  const { browser, page } = await launch(launchOptions);
  console.log(`\n▶ ${name}`);
  try {
    await fn(page, check);
  } catch (e) {
    console.log('  ERROR:', e.message);
    results.push(false);
  } finally {
    await browser.close();
  }
  return results.every(Boolean);
}

// ── harness pathways ─────────────────────────────────────────────────────────

// Serve the harness at an allowlisted origin and wait for the builder's
// handshake. Returns nothing; use `frame(page)` for the builder's DOM.
async function openHarness(page) {
  const html = await readFile(HARNESS_FILE, 'utf8');
  await page.route(`${HARNESS_ORIGIN}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(`${HARNESS_URL}?builder=${encodeURIComponent(BUILDER_URL)}`, { waitUntil: 'domcontentloaded' });
  await waitForMessage(page, 'mkp:ready');
}

const frame = (page) => page.frameLocator('#builder');

function builderEval(page, fn, arg) {
  const f = page.frame({ name: 'builder' });
  if (!f) throw new Error('builder frame not found');
  return f.evaluate(fn, arg);
}

// Wait until at least `minCount` messages of `type` have been seen; return the
// latest one's data.
async function waitForMessage(page, type, minCount = 1, timeout = 10000) {
  await page.waitForFunction(
    ([t, n]) => (window.__messages || []).filter((m) => m.type === t).length >= n,
    [type, minCount],
    { timeout },
  );
  return page.evaluate((t) => window.__last(t), type);
}

const count = (page, type) => page.evaluate((t) => window.__count(t), type);
const last  = (page, type) => page.evaluate((t) => window.__last(t), type);

async function harness(page, id) {
  await page.locator(`#${id}`).click();
  await settle(page, 300);
}

async function loadSample(page) {
  await harness(page, 'load-sample');
  await frame(page).locator('.entry-card').first().waitFor({ timeout: 8000 });
  await settle(page, 500); // past the dirty debounce, so the first mkp:dirty has landed
}

async function reloadFrame(page) {
  const before = await count(page, 'mkp:ready');
  await page.evaluate(() => window.__reload());
  await waitForMessage(page, 'mkp:ready', before + 1);
  await settle(page, 300);
}

// Expand a desktop card and type into its name field. Waits past the dirty
// debounce so the flag has been recomputed by the time the caller looks.
async function editName(page, index, text) {
  const card = frame(page).locator('.entry-card').nth(index);
  if ((await card.locator('.entry-card-body').count()) === 0) {
    await card.locator('.entry-card-header').dblclick();
  }
  const input = card.locator('.entry-name-field');
  await input.waitFor({ timeout: 4000 });
  await input.fill(text);
  await settle(page, 600);
}

async function names(page) {
  const raw = await frame(page).locator('.entry-card .entry-label').allInnerTexts();
  return raw.map((t) => t.replace(/^#\d+:\s*/, '').trim());
}

async function isMacBrowser(page) {
  return builderEval(page, () => /Mac|iPhone|iPad|iPod/.test(navigator.platform || ''));
}

const title = (page) => frame(page).locator('.title-field-name').first().innerText();

// ── scenarios ────────────────────────────────────────────────────────────────

const SCENARIOS = [
  scenario('Host: handshake, load, and the chrome that goes away', async (page, check) => {
    await openHarness(page);
    const ready = await last(page, 'mkp:ready');
    check('mkp:ready carries protocolVersion 1', ready.protocolVersion, 1);
    check('mkp:ready carries an appVersion', typeof ready.appVersion === 'string' && ready.appVersion.length > 0, true);
    check('no message was dropped for a bad origin', await page.evaluate(() => window.__rejected.length), 0);

    const f = frame(page);
    check('no lander in host mode', await f.locator('.lander').count(), 0);
    check('connecting screen before mkp:load', await f.locator('.host-connecting').count(), 1);
    check('window fills the frame', await f.locator('.floating-window--fill').count(), 1);

    await loadSample(page);
    check('three entry cards, hidden one included', await f.locator('.entry-card').count(), 3);
    check('connecting screen gone', await f.locator('.host-connecting').count(), 0);
    check('title is the host\'s name', await title(page), 'Harness Sample');
    check('hidden entry shows its badge', await f.locator('.entry-hidden-icon').count(), 1);
    check('folder from builderMeta renders', await f.locator('.folder-header').count(), 1);
    check('first mkp:dirty is false', (await last(page, 'mkp:dirty'))?.dirty, false);

    check('no pull tab', await f.locator('.lorebook-tab').count(), 0);
    check('no resize handles', await f.locator('.resize-handle').count(), 0);
    check('no header close button', await f.locator('.header-close').count(), 0);
    check('Save to CharSnap button in the header', await f.locator('.host-save-btn').count(), 1);
    check('hotbar gets a Save slot', await f.locator('.hotbar .footer-btn', { hasText: 'Save' }).count(), 1);
    check('footer shows the host sync state', await f.locator('.status-host--synced').count(), 1);

    // Text must come through verbatim — no importer "unescaping".
    const sample = await page.evaluate(() => window.__SAMPLE);
    await f.locator('.entry-card').first().locator('.entry-card-header').dblclick();
    await f.locator('.entry-card').first().locator('.description-textarea').waitFor({ timeout: 4000 });
    check('description is byte-faithful',
      await f.locator('.entry-card').first().locator('.description-textarea').inputValue(), sample.entries[0].description);
    check('expanding a card did not dirty the draft', (await last(page, 'mkp:dirty'))?.dirty, false);
  }),

  scenario('Host: dirty flag + Ctrl+S round trip, hidden entry saved as disabled', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);

    await editName(page, 0, 'Ashfall Keep II');
    check('edit posts mkp:dirty true', (await waitForMessage(page, 'mkp:dirty', 2))?.dirty, true);
    check('header button shows the dirty dot', await f.locator('.host-save-btn--dirty').count(), 1);
    check('footer says unsaved', await f.locator('.status-host--dirty').count(), 1);

    // Focus is inside the frame (the name field), so the chord reaches the builder.
    const mod = (await isMacBrowser(page)) ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+s`);
    const save = await waitForMessage(page, 'mkp:save');
    check('mkp:save hostId', save.hostId, 'lb_sample');
    check('mkp:save name', save.name, 'Harness Sample');
    check('ALL entries, current order', save.entries.map((e) => e.name).join('|'), 'Ashfall Keep II|Mara Vell|The Ember Rite');
    check('hidden entry → disabled true', save.entries[2].disabled, true);
    check('visible entry → disabled false', save.entries[0].disabled, false);
    check('entryType is the label form', save.entries.map((e) => e.entryType).join(','), 'Location,Character,PlotEvent');
    check('isPublic round-trips', save.entries.map((e) => e.isPublic).join(','), 'true,false,false');
    check('builderMeta.version', save.builderMeta.version, 1);
    check('builderMeta.folders', save.builderMeta.folders.length, 1);
    check('builderMeta.entryMeta is index-aligned', save.builderMeta.entryMeta.length, 3);
    check('entryMeta keeps the placement', save.builderMeta.entryMeta[0].folderId, 'f1');
    check('no force flag on a first save', 'force' in save, false);
    check('button reads Saving…', await f.locator('.host-save-btn').innerText(), 'Saving…');
    check('button is disabled while saving', await f.locator('.host-save-btn').isDisabled(), true);

    await harness(page, 'reply-saved');
    await settle(page, 400);
    check('mkp:saved clears dirty', (await last(page, 'mkp:dirty'))?.dirty, false);
    check('footer says saved', await f.locator('.status-host--synced').count(), 1);
    check('button re-enabled', await f.locator('.host-save-btn').isDisabled(), false);
    check('no dirty dot', await f.locator('.host-save-btn--dirty').count(), 0);

    // The button does the same thing as the chord.
    await editName(page, 0, 'Ashfall Keep III');
    await f.locator('.host-save-btn').click();
    const second = await waitForMessage(page, 'mkp:save', 2);
    check('second save via the button', second.entries[0].name, 'Ashfall Keep III');
  }),

  scenario('Host: request-save is blocked locally for an invalid entry', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);

    await f.locator('.footer-fab').click();
    await settle(page, 400);
    check('four cards', await f.locator('.entry-card').count(), 4);

    await harness(page, 'request-save');
    await settle(page, 600);
    check('nothing was posted to the host', await count(page, 'mkp:save'), 0);
    check('error banner is up', await f.locator('.host-save-errors').count(), 1);
    const text = await f.locator('.host-save-errors').innerText();
    check('lists the missing trigger', text.includes('trigger'), true);
    check('lists the missing description', text.includes('Description is required'), true);
    check('the offending entry is expanded', await f.locator('.entry-card').nth(3).locator('.entry-card-body').count(), 1);

    await f.locator('.host-save-errors-close').click();
    await settle(page, 200);
    check('banner dismisses', await f.locator('.host-save-errors').count(), 0);
  }),

  scenario('Host: save-rejected from the host highlights the entry', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);
    check('cards start collapsed', await f.locator('.entry-card-body').count(), 0);

    await harness(page, 'reply-rejected');
    await settle(page, 400);
    check('error banner is up', await f.locator('.host-save-errors').count(), 1);
    check('banner names the entry', (await f.locator('.host-save-errors').innerText()).includes('Mara Vell'), true);
    check('banner carries the host\'s message', (await f.locator('.host-save-errors').innerText()).includes('over 1500'), true);
    check('entry #2 is expanded', await f.locator('.entry-card').nth(1).locator('.entry-card-body').count(), 1);
    check('entry #1 is not', await f.locator('.entry-card').nth(0).locator('.entry-card-body').count(), 0);
    check('save button is usable again', await f.locator('.host-save-btn').isDisabled(), false);
  }),

  scenario('Host: theme is applied from the host and never persisted', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);
    const theme = await page.evaluate(() => window.__THEME);

    await harness(page, 'theme');
    await settle(page, 300);
    check('data-theme becomes custom', await builderEval(page, () => document.documentElement.getAttribute('data-theme')), 'custom');
    check('--bg is the host token',
      await builderEval(page, () => document.documentElement.style.getPropertyValue('--bg')), theme.tokens['--bg']);
    check('--blue is the host token',
      await builderEval(page, () => document.documentElement.style.getPropertyValue('--blue')), theme.tokens['--blue']);

    // Settings says who set it.
    await f.locator('.menu-btn--gear').click();
    await settle(page, 300);
    const header = f.locator('.settings-section', { has: f.locator('.settings-section-title', { hasText: 'Appearance' }) })
      .locator('.settings-section-header').first();
    await header.click();
    await settle(page, 200);
    check('Settings notes the host theme', await f.locator('.host-theme-note').count(), 1);
    check('no theme radio reads as active', await f.locator('.theme-option--active').count(), 0);

    // A reload proves nothing reached mkp_settings: the host has not re-sent
    // its theme, so the builder must be back on its own.
    await reloadFrame(page);
    check('after reload, --bg is not set', await builderEval(page, () => document.documentElement.style.getPropertyValue('--bg')), '');
    check('after reload, data-theme is the builder default', await builderEval(page, () => document.documentElement.getAttribute('data-theme')), 'dark');
  }),

  scenario('Host: set-name applies and the rename affordances are gone', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);

    await harness(page, 'set-name');
    check('title follows mkp:set-name', await title(page), 'Renamed by Host');
    check('renaming dirties the draft', (await waitForMessage(page, 'mkp:dirty', 2))?.dirty, true);

    await f.locator('.title-field').first().dblclick();
    await settle(page, 200);
    check('double-click does not open the rename input', await f.locator('.lorebook-name-input').count(), 0);

    // The double-click's two clicks pinned and then unpinned the menu; one
    // more click pins it open for a look inside.
    if ((await f.locator('.title-menu').count()) === 0) {
      await f.locator('.title-field').first().click();
    }
    await f.locator('.title-menu').waitFor({ timeout: 4000 });
    check('title menu has no lorebooks column', await f.locator('.title-menu .tm-col--books').count(), 0);
    check('title menu keeps import / export', await f.locator('.title-menu .tm-col--io').count(), 1);
    check('single-column variant', await f.locator('.title-menu--io-only').count(), 1);
    await page.keyboard.press('Escape');
  }),

  scenario('Host: import flow offers no "Import as new"', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);
    await f.locator('.hotbar').locator('button', { hasText: 'Import' }).first().click();
    // Scoped to the overlay: the always-mounted Import/Export side panel
    // renders a second ImportFlow, so unscoped selectors resolve to two.
    const panel = f.locator('.append-import-panel');
    await panel.waitFor({ timeout: 4000 });
    await panel.locator('.import-flow-swap--paste').click();
    await panel.locator('.import-flow-textarea').fill('Name: Pasted\nTriggers: pasted\nDescription: From the harness.');
    await panel.locator('.import-flow-parse-btn').click();
    await panel.locator('.import-flow-grid').waitFor({ timeout: 4000 });
    const titles = await panel.locator('.import-flow-opt-title').allInnerTexts();
    check('disposition grid drops Import as new', titles.includes('Import as new'), false);
    check('Append / Replace / Back up first remain', titles.join('|'), 'Append|Replace|Back up first');
    await panel.locator('.import-flow-opt', { hasText: 'Append' }).click();
    await panel.locator('.import-flow-confirm').click();
    await settle(page, 400);
    check('append landed', await f.locator('.entry-card').count(), 4);
  }),

  scenario('Host: draft resumes across a reload; a newer server copy prompts', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);

    await editName(page, 0, 'Draft edit');
    await waitForMessage(page, 'mkp:dirty', 2);
    await settle(page, 1200); // autosave debounce — the draft must reach localStorage

    await reloadFrame(page);
    await loadSample(page);
    check('same updatedAt → draft resumes silently', (await names(page))[0], 'Draft edit');
    check('…and reports dirty', (await last(page, 'mkp:dirty'))?.dirty, true);
    check('no prompt', await f.locator('.host-conflict').count(), 0);

    await harness(page, 'load-newer');
    await settle(page, 300);
    check('newer server copy + dirty draft → prompt', await f.locator('.host-conflict--load').count(), 1);
    await f.locator('.host-conflict-btn', { hasText: 'Resume my draft' }).click();
    await settle(page, 400);
    check('resume keeps the draft', (await names(page))[0], 'Draft edit');
    check('resume stays dirty', (await last(page, 'mkp:dirty'))?.dirty, true);

    await harness(page, 'load-newer');
    await f.locator('.host-conflict--load').waitFor({ timeout: 4000 });
    await f.locator('.host-conflict-btn', { hasText: 'CharSnap' }).click();
    await settle(page, 500);
    check('"Use CharSnap\'s version" replaces the content', (await names(page))[0], 'Ashfall Keep');
    check('…including the name', await title(page), 'Harness Sample (server edit)');
    check('…and is clean', (await last(page, 'mkp:dirty'))?.dirty, false);

    // A clean draft and a newer server copy: no prompt, just take it.
    await harness(page, 'load-sample'); // older updatedAt — clean, not newer → keep what we have
    await settle(page, 400);
    check('older copy on a clean draft keeps the current content', await title(page), 'Harness Sample (server edit)');
    check('still no prompt', await f.locator('.host-conflict').count(), 0);
  }),

  scenario('Host: new book (hostId null) — save assigns the id; a leftover draft is offered', async (page, check) => {
    await openHarness(page);
    const f = frame(page);
    await harness(page, 'load-new');
    await f.locator('.footer-fab').waitFor({ timeout: 8000 });
    await settle(page, 400);
    check('empty book', await f.locator('.entry-card').count(), 0);
    check('host name', await title(page), 'New Lorebook');
    check('clean on arrival', (await last(page, 'mkp:dirty'))?.dirty, false);

    await f.locator('.footer-fab').click();
    await settle(page, 300);
    const card = f.locator('.entry-card').first();
    await card.locator('.entry-name-field').fill('Alpha');
    await card.locator('.trigger-input').fill('alpha');
    await card.locator('.trigger-input').press('Enter');
    await card.locator('.description-textarea').fill('First entry.');
    await settle(page, 600);
    check('dirty after building an entry', (await last(page, 'mkp:dirty'))?.dirty, true);

    await f.locator('.host-save-btn').click();
    const save = await waitForMessage(page, 'mkp:save');
    check('first save has hostId null', save.hostId, null);
    check('first save carries the entry', save.entries[0].name, 'Alpha');
    await harness(page, 'reply-saved'); // harness assigns lb_new
    await settle(page, 400);
    check('clean after mkp:saved', (await last(page, 'mkp:dirty'))?.dirty, false);

    await editName(page, 0, 'Alpha 2');
    await f.locator('.host-save-btn').click();
    const second = await waitForMessage(page, 'mkp:save', 2);
    check('second save carries the assigned hostId', second.hostId, 'lb_new');
    await harness(page, 'reply-saved');
    await settle(page, 400);

    // Another new book: the saved one is not "pending" any more, so no prompt.
    await harness(page, 'load-new');
    await settle(page, 500);
    check('a fresh new book after a saved one — no prompt', await f.locator('.host-conflict').count(), 0);
    check('…and it is empty', await f.locator('.entry-card').count(), 0);

    // Leave this one unsaved with content; the next new-book load offers it.
    await f.locator('.footer-fab').click();
    await settle(page, 300);
    await f.locator('.entry-card').first().locator('.entry-name-field').fill('Orphan');
    await settle(page, 1200);
    await reloadFrame(page);
    await harness(page, 'load-new');
    await f.locator('.host-conflict--load-pending').waitFor({ timeout: 6000 });
    check('unsaved new-book draft is offered', await f.locator('.host-conflict--load-pending').count(), 1);
    await f.locator('.host-conflict-btn', { hasText: 'Resume draft' }).click();
    await settle(page, 400);
    check('resume brings the draft back', (await names(page))[0], 'Orphan');

    await reloadFrame(page);
    await harness(page, 'load-new');
    await f.locator('.host-conflict--load-pending').waitFor({ timeout: 6000 });
    await f.locator('.host-conflict-btn', { hasText: 'Discard' }).click();
    await settle(page, 400);
    check('discard starts fresh', await f.locator('.entry-card').count(), 0);
    await reloadFrame(page);
    await harness(page, 'load-new');
    await settle(page, 600);
    check('the discarded draft is gone for good', await f.locator('.host-conflict').count(), 0);
  }),

  scenario('Host: save conflict offers Overwrite (force) and Keep editing; other failures notify', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);

    await editName(page, 0, 'Conflicting edit');
    await f.locator('.host-save-btn').click();
    await waitForMessage(page, 'mkp:save');
    await harness(page, 'reply-failed-conflict');
    await f.locator('.host-conflict--save').waitFor({ timeout: 4000 });
    check('conflict dialog is up', await f.locator('.host-conflict--save').count(), 1);
    check('button re-enabled behind it', await f.locator('.host-save-btn').isDisabled(), false);

    await f.locator('.host-conflict-btn', { hasText: 'Keep editing' }).click();
    await settle(page, 200);
    check('Keep editing closes the dialog', await f.locator('.host-conflict').count(), 0);
    check('…and posts nothing', await count(page, 'mkp:save'), 1);
    check('…and the draft is still dirty', (await last(page, 'mkp:dirty'))?.dirty, true);

    await f.locator('.host-save-btn').click();
    await waitForMessage(page, 'mkp:save', 2);
    await harness(page, 'reply-failed-conflict');
    await f.locator('.host-conflict--save').waitFor({ timeout: 4000 });
    await f.locator('.host-conflict-btn', { hasText: 'Overwrite' }).click();
    const forced = await waitForMessage(page, 'mkp:save', 3);
    check('Overwrite re-posts with force: true', forced.force, true);
    check('…same hostId', forced.hostId, 'lb_sample');
    check('…same content', forced.entries[0].name, 'Conflicting edit');
    await harness(page, 'reply-saved');
    await settle(page, 400);
    check('clean after the forced save is confirmed', (await last(page, 'mkp:dirty'))?.dirty, false);

    // Reload from CharSnap: the builder asks for a fresh load; the harness
    // answers with the newer copy; dirty + newer → the load dialog.
    await editName(page, 0, 'Reload me');
    await page.locator('#auto-request-load').check();
    await f.locator('.host-save-btn').click();
    await waitForMessage(page, 'mkp:save', 4);
    await harness(page, 'reply-failed-conflict');
    await f.locator('.host-conflict--save').waitFor({ timeout: 4000 });
    await f.locator('.host-conflict-btn', { hasText: 'Reload' }).click();
    await waitForMessage(page, 'mkp:request-load');
    check('Reload posts mkp:request-load', await count(page, 'mkp:request-load'), 1);
    await f.locator('.host-conflict--load').waitFor({ timeout: 6000 });
    check('the fresh load opens the resume / use-CharSnap dialog', await f.locator('.host-conflict--load').count(), 1);
    await f.locator('.host-conflict-btn', { hasText: 'Resume my draft' }).click();
    await settle(page, 400);
    check('resuming keeps the local edit', (await names(page))[0], 'Reload me');
    await page.locator('#auto-request-load').uncheck();

    await f.locator('.host-save-btn').click();
    await waitForMessage(page, 'mkp:save', 5);
    await harness(page, 'reply-failed-error');
    await settle(page, 300);
    check('a non-conflict failure shows no dialog', await f.locator('.host-conflict').count(), 0);
    check('…but a footer notice', (await f.locator('.status-host-notice').innerText()).includes('Network error'), true);
    check('…and the draft stays dirty', (await last(page, 'mkp:dirty'))?.dirty, true);
  }),

  scenario('Host: typing is hard-capped at CharSnap\'s limits', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);
    const card = f.locator('.entry-card').first();
    await card.locator('.entry-card-header').dblclick();
    await card.locator('.entry-name-field').waitFor({ timeout: 4000 });

    await card.locator('.entry-name-field').fill('x'.repeat(60));
    check('entry name stops at 50', (await card.locator('.entry-name-field').inputValue()).length, 50);

    await card.locator('.description-textarea').fill('d'.repeat(1600));
    check('description stops at 1500', (await card.locator('.description-textarea').inputValue()).length, 1500);

    const many = Array.from({ length: 30 }, (_, i) => `t${i}`).join(', ');
    await card.locator('.trigger-input').fill(many);
    await card.locator('.trigger-input').press('Enter');
    await settle(page, 300);
    check('triggers stop at 25', await card.locator('.trigger-chips .chip').count(), 25);
    check('the cap is announced', (await card.locator('.trigger-chips-footer').innerText()).includes('Limit of 25'), true);
  }),

  scenario('Host: the flag alone at top level is still the standalone app', async (page, check) => {
    await page.goto(BUILDER_URL, { waitUntil: 'networkidle' });
    await settle(page, 400);
    check('lander shows', await page.locator('.lander').count(), 1);
    check('no connecting screen', await page.locator('.host-connecting').count(), 0);
    await page.locator('.lander-tile', { hasText: 'New Lorebook' }).click();
    await settle(page, 400);
    check('window is not filling the page', await page.locator('.floating-window--fill').count(), 0);
    check('no Save to CharSnap button', await page.locator('.host-save-btn').count(), 0);
    check('pull tab is present', await page.locator('.lorebook-tab').count(), 1);
  }),

  scenario('Host: phone layout — save button, no Lorebooks tab', async (page, check) => {
    await openHarness(page);
    await loadSample(page);
    const f = frame(page);
    check('cards render on a phone', await f.locator('.entry-card').count(), 3);
    check('compact Save button', await f.locator('.host-save-btn').innerText(), 'Save');
    await tap(page, f.locator('.title-field--mobile'));
    await f.locator('.mtm').waitFor({ timeout: 4000 });
    const tabs = await f.locator('.mtm-tab').allInnerTexts();
    check('only the Import / Export tab', tabs.join('|'), 'Import / Export');
    check('no ＋ New footer', await f.locator('.mtm-foot').count(), 0);
  }, PHONE),
];

function selectScenarios(filter) {
  if (!filter) return SCENARIOS;
  const terms = filter.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (terms.length === 0) return SCENARIOS;
  return SCENARIOS.filter((s) => terms.some((t) => s.name.toLowerCase().includes(t)));
}

// Returns true / false for a run, or null when the filter matched nothing here
// (so the runner can tell "ran nothing" from "failed").
export async function runHostChecks(filter = process.env.VERIFY_ONLY) {
  const chosen = selectScenarios(filter);
  if (chosen.length === 0) return null;
  console.log(`\nHost harness: ${HARNESS_FILE}`);
  if (chosen.length !== SCENARIOS.length) {
    console.log(`Filter ${JSON.stringify(filter)} — running ${chosen.length}/${SCENARIOS.length} host scenarios.`);
  }
  const outcomes = [];
  for (const s of chosen) outcomes.push(await runScenario(s));
  const passed = outcomes.filter(Boolean).length;
  console.log(`\nHost: ${passed}/${outcomes.length} scenarios passed`);
  return outcomes.every(Boolean);
}

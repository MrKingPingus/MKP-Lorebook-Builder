// Behavioural checks for the Public/Private + Hide-from-Export features, driven
// against the real dev server through verify/driver.mjs. Each scenario runs in a
// fresh browser so state never leaks between them. Values are anchored to the
// committed fixture (fixtures/reika-test-book.json): 34 entries, 29 public / 5
// private, 0 hidden-from-export.
import { launch, openBuilderWithFixture, enterSelectMode, selectCards, exportJson, countPrivate, openSettings, pairCrosstalk, FIXTURE } from './driver.mjs';
import { VARIANT_COUNTS, VARIANT_MARKER } from '../fixtures/build-variant-book.mjs';

function scenario(name, fn) {
  return { name, fn };
}

async function runScenario({ name, fn }) {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };
  const { browser, page } = await launch();
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

const SCENARIOS = [
  scenario('Import parity + Public badges + private-by-default', async (page, check) => {
    check('entry cards imported', await openBuilderWithFixture(page), 34);
    // Lander import goes straight in — no "Name your lorebook" modal, no
    // import-panel disposition prompt (issue: messy lander-import flow).
    check('no name modal after lander import', await page.locator('.lb-name-modal-overlay').count(), 0);
    check('no import disposition prompt', await page.locator('.import-save-prompt').count(), 0);
    check('public eye badges (isPublic===true)', await page.locator('.entry-public-icon').count(), 29);
    check('exported private count', countPrivate(await exportJson(page)), 5);
    check('no export-off badges', await page.locator('.entry-hidden-icon').count(), 0);
    // A brand-new entry must default to private (CharSnap mirror).
    await page.locator('.footer-fab').click();
    await page.waitForTimeout(300);
    check('public badges unchanged after add', await page.locator('.entry-public-icon').count(), 29);
    check('new entry is private', countPrivate(await exportJson(page)), 6);
  }),

  scenario('Bulk Hide / Show from Export', async (page, check) => {
    await openBuilderWithFixture(page);
    await enterSelectMode(page);
    const hideBtn = page.locator('.bulk-action-apply', { hasText: 'Hide from Export' });
    check('Hide-from-Export button present', await hideBtn.count(), 1);
    check('disabled with no selection', await hideBtn.isDisabled(), true);
    const cards = page.locator('.entry-card');
    await cards.nth(0).click();
    await cards.nth(1).click();
    await page.waitForTimeout(100);
    await hideBtn.click();
    const chips = await page.locator('.bulk-action-chips .bulk-type-chip').allInnerTexts();
    check('two hide chips (Hidden/Shown)', chips.join(','), 'Hidden,Shown');
    await page.locator('.bulk-type-chip', { hasText: 'Hidden' }).click();
    await page.waitForTimeout(200);
    check('export-off badges after Hide x2', await page.locator('.entry-hidden-icon').count(), 2);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    check('undo restores', await page.locator('.entry-hidden-icon').count(), 0);
    // Mutual exclusivity of the picker rows.
    await page.locator('.bulk-action-apply', { hasText: 'Set Public/Private' }).click();
    await page.waitForTimeout(60);
    await hideBtn.click();
    await page.waitForTimeout(60);
    check('one chip row open at a time', await page.locator('.bulk-action-chips').count(), 1);
  }),

  scenario('Bulk Public / Private (via JSON export)', async (page, check) => {
    await openBuilderWithFixture(page);
    check('baseline private', countPrivate(await exportJson(page)), 5);
    await enterSelectMode(page);
    const pubBtn = page.locator('.bulk-action-apply', { hasText: 'Set Public/Private' });
    const cards = page.locator('.entry-card');
    await cards.nth(0).click();
    await cards.nth(1).click();
    await page.waitForTimeout(100);
    await pubBtn.click();
    const chips = await page.locator('.bulk-action-chips .bulk-type-chip').allInnerTexts();
    check('two public chips (Public/Private)', chips.join(','), 'Public,Private');
    await page.locator('.bulk-type-chip', { hasText: 'Private' }).click();
    await page.waitForTimeout(150);
    check('private after Private x2', countPrivate(await exportJson(page)), 7);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(150);
    check('private after undo', countPrivate(await exportJson(page)), 5);
    // Chaining: selection persists, so we can flip the same set to Public.
    await pubBtn.click();
    await page.waitForTimeout(60);
    await page.locator('.bulk-type-chip', { hasText: 'Private' }).click();
    await page.waitForTimeout(150);
    check('private after re-Private', countPrivate(await exportJson(page)), 7);
    await pubBtn.click();
    await page.waitForTimeout(60);
    await page.locator('.bulk-type-chip', { hasText: 'Public' }).click();
    await page.waitForTimeout(150);
    check('private after Public', countPrivate(await exportJson(page)), 5);
  }),

  scenario('Opt-in "Mark private entries" setting', async (page, check) => {
    await openBuilderWithFixture(page);
    check('private badges default off', await page.locator('.entry-private-icon').count(), 0);
    await openSettings(page);
    const cb = page.locator('label:has-text("Mark private entries") input[type="checkbox"]');
    await cb.waitFor({ timeout: 4000 });
    await cb.check();
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    check('private badges after enabling', await page.locator('.entry-private-icon').count(), 5);
    check('public badges unchanged', await page.locator('.entry-public-icon').count(), 29);
  }),

  scenario('Default hotkeys + help overlay + Escape dismiss', async (page, check) => {
    await openBuilderWithFixture(page);
    const cards = page.locator('.entry-card');
    const before = await cards.count();
    // ? opens the cheat sheet; Escape closes it (top-priority dismiss layer).
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('?');
    await page.waitForTimeout(200);
    check('? opens keyboard help', await page.locator('.kbd-help-panel').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check('Escape closes help', await page.locator('.kbd-help-panel').count(), 0);
    // Alt+S toggles select mode; Escape exits it.
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Alt+s');
    await page.waitForTimeout(200);
    check('Alt+S enters select mode', await page.locator('.bulk-action-bar').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check('Escape exits select mode', await page.locator('.bulk-action-bar').count(), 0);
    // New-entry hotkey last — it auto-focuses the new entry, which (correctly)
    // suppresses further bare/Alt hotkeys until the field is blurred.
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Alt+n');
    await page.waitForTimeout(300);
    check('Alt+N adds an entry', await cards.count(), before + 1);
    // Alt+I opens the append-import overlay straight into file mode.
    await page.evaluate(() => document.activeElement?.blur());
    page.on('filechooser', () => {}); // swallow the auto-opened OS picker in headless
    await page.keyboard.press('Alt+i');
    await page.waitForTimeout(250);
    check('Alt+I opens import overlay', await page.locator('.append-import-overlay').count(), 1);
    check('Alt+I lands in file mode', await page.locator('.append-file-picker').count(), 1);
    // After picking a file, offer Append vs Import-as-New (not auto-append).
    await page.locator('.append-file-picker input[type=file]').setInputFiles(FIXTURE);
    await page.waitForTimeout(400);
    check('Append option offered', await page.locator('.append-book-actions button', { hasText: 'Append to' }).count(), 1);
    check('Import-as-New option offered', await page.locator('.append-book-actions button', { hasText: 'Import as New' }).count(), 1);
  }),

  scenario('Hotkeys in fields + find focus + export + help-close', async (page, check) => {
    await openBuilderWithFixture(page);
    const cards = page.locator('.entry-card');
    const before = await cards.count();

    // Note 1: "/" focuses search; a modified chord still fires while focused there.
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('/');
    await page.waitForTimeout(150);
    check('/ focuses the search input', await page.evaluate(() => (document.activeElement?.className || '').includes('search-input')), true);
    await page.keyboard.press('Alt+n');
    await page.waitForTimeout(250);
    check('Alt+N fires from inside the search field', await cards.count(), before + 1);

    // Note 3: undo works even though focus is now in the new entry's field.
    check('focus moved into a text field', await page.evaluate(() => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)), true);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(250);
    check('Ctrl+Z undoes from within a field', await cards.count(), before);

    // Note 2: Alt+H opens find/replace AND focuses the Find field.
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Alt+h');
    await page.waitForTimeout(250);
    check('Alt+H focuses the Find field', await page.evaluate(() => (document.activeElement?.className || '').includes('find-input')), true);
    // Note 2: pressing Alt+H again toggles back to Search.
    await page.keyboard.press('Alt+h');
    await page.waitForTimeout(250);
    check('Alt+H again reverts to search', await page.locator('input.search-input').count(), 1);
    check('...Find field gone', await page.locator('.find-input').count(), 0);

    // Note 5: Alt+E surfaces the centered export menu (same menu as the button).
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Alt+e');
    await page.waitForTimeout(250);
    check('Alt+E opens the export menu', await page.locator('.export-menu').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // Note 4: a hotkey pressed while the guide is open closes it and still runs.
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('?');
    await page.waitForTimeout(150);
    check('help overlay open', await page.locator('.kbd-help-panel').count(), 1);
    await page.keyboard.press('Alt+s');
    await page.waitForTimeout(200);
    check('a hotkey closes the guide', await page.locator('.kbd-help-panel').count(), 0);
    check('...and still runs (select on)', await page.locator('.bulk-action-bar').count(), 1);
  }),

  scenario('Escape stack pops the top layer first', async (page, check) => {
    await openBuilderWithFixture(page);
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Alt+s');
    await page.waitForTimeout(150);
    check('select mode active', await page.locator('.bulk-action-bar').count(), 1);
    await page.keyboard.press('?');
    await page.waitForTimeout(150);
    check('help overlay open over select', await page.locator('.kbd-help-panel').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check('Escape closes help first', await page.locator('.kbd-help-panel').count(), 0);
    check('select mode still active beneath', await page.locator('.bulk-action-bar').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check('Escape then exits select', await page.locator('.bulk-action-bar').count(), 0);
  }),

  scenario('Rebind new-entry hotkey + live display', async (page, check) => {
    await openBuilderWithFixture(page);
    const cards = page.locator('.entry-card');
    const before = await cards.count();
    await openSettings(page);
    await page.locator('.settings-section-header', { hasText: 'Accessibility' }).click();
    await page.waitForTimeout(150);
    const row = page.locator('.kbd-settings-row', { hasText: 'New entry' });
    const captureBtn = row.locator('.kbd-capture-btn');
    await captureBtn.click();
    await page.waitForTimeout(120);
    await page.keyboard.press('Alt+j');                 // capture the new chord
    await page.waitForTimeout(200);
    const label = (await captureBtn.innerText()).replace(/\s+/g, '');
    check('capture button shows new chord', /Alt\+?J/i.test(label), true);
    // Fire the new binding (the global window listener works with the tray open).
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Alt+j');
    await page.waitForTimeout(300);
    check('new chord adds an entry', await cards.count(), before + 1);
    await page.keyboard.press('Alt+n');                 // old default no longer bound
    await page.waitForTimeout(200);
    check('old Alt+N no longer adds', await cards.count(), before + 1);
  }),

  scenario('Themes: switch, custom colors, persist across reload', async (page, check) => {
    await openBuilderWithFixture(page);
    await openSettings(page);
    await page.locator('.settings-section-header', { hasText: 'Appearance' }).click();
    await page.waitForTimeout(150);

    const themeAttr = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    check('default theme is dark', await themeAttr(), 'dark');
    const darkBg = await bodyBg();

    await page.locator('.theme-option', { hasText: 'Light' }).click();
    await page.waitForTimeout(200);
    check('data-theme flips to light', await themeAttr(), 'light');
    check('body background actually changed', (await bodyBg()) !== darkBg, true);

    await page.locator('.theme-option', { hasText: 'High contrast' }).click();
    await page.waitForTimeout(150);
    check('data-theme high-contrast', await themeAttr(), 'high-contrast');

    // System resolves to a concrete palette (OS light/dark), never 'system'.
    await page.locator('.theme-option', { hasText: 'System' }).click();
    await page.waitForTimeout(150);
    check('System resolves to light/dark', ['light', 'dark'].includes(await themeAttr()), true);

    await page.locator('.theme-option', { hasText: 'Custom' }).click();
    await page.waitForTimeout(150);
    check('data-theme custom', await themeAttr(), 'custom');
    check('seven custom color inputs', await page.locator('.theme-color-input').count(), 7);

    // Set the first core token (--bg) and confirm it's injected inline.
    await page.evaluate(() => {
      const input = document.querySelector('.theme-color-input');
      // Bypass React's controlled-input value tracker so onChange fires.
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '#123456');
      input.dispatchEvent(new Event('input',  { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    check('custom --bg injected inline', await page.evaluate(() => document.documentElement.style.getPropertyValue('--bg').trim()), '#123456');

    // Reload — theme + custom color must survive (applied pre-render in main.jsx).
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    check('theme persists after reload', await themeAttr(), 'custom');
    check('custom color persists after reload', await page.evaluate(() => document.documentElement.style.getPropertyValue('--bg').trim()), '#123456');
  }),

  scenario('Accessibility: text scale, reduced motion, high contrast', async (page, check) => {
    await openBuilderWithFixture(page);
    await openSettings(page);
    await page.locator('.settings-section-header', { hasText: 'Accessibility' }).click();
    await page.waitForTimeout(150);

    const rootScale = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim());
    const bodyFont  = () => page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));

    const beforeFont = await bodyFont();
    await page.locator('.a11y-scale-btn', { hasText: '125%' }).click();
    await page.waitForTimeout(150);
    check('ui-scale set to 1.25', await rootScale(), '1.25');
    check('body text got larger', (await bodyFont()) > beforeFont, true);

    await page.locator('label:has-text("Reduce motion") input[type=checkbox]').check();
    await page.waitForTimeout(100);
    check('data-reduce-motion set', await page.evaluate(() => document.documentElement.getAttribute('data-reduce-motion')), 'true');

    await page.locator('label:has-text("High-contrast theme") input[type=checkbox]').check();
    await page.waitForTimeout(100);
    check('high-contrast theme toggles on', await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'high-contrast');

    // Hotkeys relocated under Accessibility.
    check('keybinding table lives here now', (await page.locator('.kbd-settings-row').count()) > 0, true);

    // Text scale survives reload (applied pre-render).
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    check('scale persists after reload', await rootScale(), '1.25');
  }),

  // Regression for #112: after Expand All, collapsing one card used to snap
  // every card shut (the individual collapse cleared the global expand flag and
  // the siblings fell back to their stale collapsed state). Now Expand/Collapse
  // All are one-shot pulses committed into each card's own state.
  scenario('Expand All then single-collapse leaves siblings expanded (#112)', async (page, check) => {
    const count = await openBuilderWithFixture(page);
    const bulkBtn = page.locator('.filter-action-btn', { hasText: /Expand All|Collapse All/ });
    await bulkBtn.click();
    await page.waitForTimeout(200);
    check('all cards expanded', await page.locator('.entry-card-body').count(), count);
    check('button offers Collapse All', (await bulkBtn.innerText()).trim(), 'Collapse All');
    // Collapse just the first card via its header toggle.
    await page.locator('.entry-card .card-action-btn', { hasText: 'Collapse' }).first().click();
    await page.waitForTimeout(200);
    check('only one card collapsed', await page.locator('.entry-card-body').count(), count - 1);
    check('button label unchanged by single collapse', (await bulkBtn.innerText()).trim(), 'Collapse All');
  }),
  // Phase 11A — folders are a builder-only layer: they group the list, they
  // reposition entries[] so a folder's members stay contiguous, and they never
  // reach an export.
  scenario('Folders: create, bulk move, tuck, undo, delete', async (page, check) => {
    const count = await openBuilderWithFixture(page);
    const newFolderBtn = page.locator('.filter-action-btn', { hasText: 'Folder' });
    await newFolderBtn.click();
    await page.waitForTimeout(200);
    check('folder header rendered', await page.locator('.folder-header').count(), 1);
    check('new folder starts empty', (await page.locator('.folder-count').innerText()).trim(), '0');

    // Bulk-move two entries in.
    await enterSelectMode(page);
    const moveBtn = page.locator('.bulk-action-apply', { hasText: 'Move to folder' });
    check('move-to-folder button present', await moveBtn.count(), 1);
    check('disabled with no selection', await moveBtn.isDisabled(), true);
    const cards = page.locator('.entry-card');
    await cards.nth(0).click();
    await cards.nth(1).click();
    await page.waitForTimeout(100);
    await moveBtn.click();
    await page.locator('.bulk-action-chips .bulk-type-chip', { hasText: 'New Folder' }).first().click();
    await page.waitForTimeout(250);
    check('two entries inside the folder', await page.locator('.folder-entries .entry-card').count(), 2);
    check('header count reflects members', (await page.locator('.folder-count').innerText()).trim(), '2');
    check('no entries lost', await page.locator('.entry-card').count(), count);
    // Filing is a "batch done" action — the selection clears so the next batch
    // can go somewhere else.
    check('selection cleared after the move', (await page.locator('.bulk-action-count').innerText()).trim(), '0 selected');

    // The cycle is full → condensed → tucked, so tucking is two stops away.
    const cycleBtn = page.locator('.folder-collapse-btn');
    await cycleBtn.click();
    await page.waitForTimeout(200);
    check('one click condenses, does not hide', await page.locator('.folder-entries .entry-card').count(), 2);
    await cycleBtn.click();
    await page.waitForTimeout(200);
    check('tucked hides folder entries', await page.locator('.folder-entries .entry-card').count(), 0);
    check('tucked total on screen', await page.locator('.entry-card').count(), count - 2);
    check('count still shown while tucked', (await page.locator('.folder-count').innerText()).trim(), '2');
    await cycleBtn.click();
    await page.waitForTimeout(200);
    check('cycling round restores members', await page.locator('.folder-entries .entry-card').count(), 2);

    // Undo pulls the entries back out of the folder.
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(250);
    check('undo empties the folder', await page.locator('.folder-entries .entry-card').count(), 0);
    check('undo keeps the folder itself', await page.locator('.folder-header').count(), 1);

    // Deleting a folder never deletes entries.
    await page.locator('.folder-delete-btn').click();
    await page.waitForTimeout(250);
    check('folder gone', await page.locator('.folder-header').count(), 0);
    check('entries survive the delete', await page.locator('.entry-card').count(), count);
    // ...and undoing the delete brings the folder back (folders ride in the
    // history snapshot alongside entries).
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(250);
    check('undo restores the deleted folder', await page.locator('.folder-header').count(), 1);
  }),

  // A folder created from a selection is always named "New Folder", so the
  // header hands over its rename input immediately. Searching also has to reach
  // inside a tucked folder, or matches filed away become unfindable.
  scenario('Folders: new-folder rename focus + search reaches into a tucked folder', async (page, check) => {
    await openBuilderWithFixture(page);
    await enterSelectMode(page);
    const cards = page.locator('.entry-card');
    await cards.nth(0).click();
    await page.waitForTimeout(100);
    // The card label reads "#N: Name" — strip the index prefix to get the name.
    const firstLabel = (await cards.nth(0).locator('.entry-label').first().innerText()).trim();
    const firstName  = firstLabel.replace(/^#\d+:\s*/, '');
    await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).click();
    await page.locator('.bulk-type-chip', { hasText: 'New folder' }).click();
    await page.waitForTimeout(250);
    check('rename input is open', await page.locator('.folder-name-input').count(), 1);
    check('rename input is focused', await page.evaluate(
      () => document.activeElement?.className || ''), 'folder-name-input');
    // Type straight over the pre-selected placeholder name.
    await page.keyboard.type('Cast');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    check('folder took the typed name', (await page.locator('.folder-name').innerText()).trim(), 'Cast');

    // Tuck it, then search for the entry hidden inside.
    await page.locator('.search-mode-select').first().selectOption('search');
    await page.waitForTimeout(150);
    // Two clicks to reach tucked (full → condensed → tucked).
    await page.locator('.folder-collapse-btn').click();
    await page.waitForTimeout(150);
    await page.locator('.folder-collapse-btn').click();
    await page.waitForTimeout(200);
    check('entry hidden while tucked', await page.locator('.folder-entries .entry-card').count(), 0);
    await page.locator('.search-input').first().fill(firstName);
    await page.waitForTimeout(350);
    check('search reaches into the tucked folder', await page.locator('.folder-entries .entry-card').count(), 1);
    await page.locator('.search-input').first().fill('');
    await page.waitForTimeout(350);
    check('folder tucks again once the search clears', await page.locator('.folder-entries .entry-card').count(), 0);
  }),

  // 11B — the middle stop of the collapse cycle. A condensed row keeps only
  // what identifies the entry plus Expand/Remove, and a single card can still
  // be opened without un-condensing the whole folder.
  scenario('Folders: condensed rows + expand one in place', async (page, check) => {
    await openBuilderWithFixture(page);
    await enterSelectMode(page);
    const cards = page.locator('.entry-card');
    for (const i of [0, 1, 2]) await cards.nth(i).click();
    await page.waitForTimeout(120);
    await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).click();
    await page.locator('.bulk-type-chip', { hasText: 'New folder' }).click();
    await page.waitForTimeout(250);
    await page.keyboard.press('Enter');
    await page.locator('.search-mode-select').first().selectOption('search');
    await page.waitForTimeout(250);

    const cycleBtn = page.locator('.folder-collapse-btn');
    const condensed = page.locator('.entry-card--condensed');

    check('starts at full size', await condensed.count(), 0);
    await cycleBtn.click();
    await page.waitForTimeout(250);
    check('cycle stop 1 condenses the members', await condensed.count(), 3);

    // Condensed keeps identity + Expand/Remove, and sheds everything else.
    check('no drag handle on a condensed row', await condensed.locator('.drag-handle').count(), 0);
    check('no stats badge on a condensed row', await condensed.locator('.stats-badge').count(), 0);
    check('Expand + Remove survive', await condensed.first().locator('.card-action-btn').count(), 2);
    check('condensed row is shorter than a full one',
      (await condensed.first().boundingBox()).height < (await cards.last().boundingBox()).height, true);

    // One card opens in place; its siblings stay condensed.
    await condensed.first().locator('.card-action-btn', { hasText: 'Expand' }).click();
    await page.waitForTimeout(300);
    check('the opened card has a body', await page.locator('.folder-entries .entry-card-body').count(), 1);
    check('its siblings stay condensed', await condensed.count(), 2);
    check('the opened card got its full chrome back',
      await page.locator('.folder-entries .entry-card:not(.entry-card--condensed) .stats-badge').count(), 1);

    // Cycle onward to tucked, then back round to full.
    await cycleBtn.click();
    await page.waitForTimeout(250);
    check('cycle stop 2 tucks everything', await page.locator('.folder-entries .entry-card').count(), 0);
    await cycleBtn.click();
    await page.waitForTimeout(250);
    check('cycle returns to full size', await page.locator('.folder-entries .entry-card').count(), 3);
    check('and nothing is condensed', await condensed.count(), 0);
  }),

  scenario('Folders never reach the export', async (page, check) => {
    const count = await openBuilderWithFixture(page);
    await page.locator('.filter-action-btn', { hasText: 'Folder' }).click();
    await page.waitForTimeout(200);
    await enterSelectMode(page);
    const cards = page.locator('.entry-card');
    await cards.nth(0).click();
    await cards.nth(1).click();
    await page.waitForTimeout(100);
    await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).click();
    await page.locator('.bulk-action-chips .bulk-type-chip', { hasText: 'New Folder' }).first().click();
    await page.waitForTimeout(250);

    const book = await exportJson(page);
    const exported = Object.values(book.entries || {});
    check('every entry still exported', exported.length, count);
    check('no folderId leaked into export', exported.some((e) => 'folderId' in e), false);
    check('no folders key on the book', 'folders' in book, false);
  }),
  // ── Crosstalk / reference mode ───────────────────────────────────────────
  // Uses pairCrosstalk(): the primary fixture active, the derived variant book
  // as the read-only reference. Counts come from the variant generator so the
  // fixture and the expectations can't drift apart.
  scenario('Crosstalk: pairing + same-name match badges', async (page, check) => {
    await pairCrosstalk(page);
    check('active book fully loaded',    await page.locator('.build-panel .entry-card').count(), 34);
    check('reference book fully loaded', await page.locator('.reference-entry-card').count(), VARIANT_COUNTS.total);

    // 10 pairs are byte-identical → green "in both"; 16 differ → yellow "differs".
    check('in-both badges on the active side',
      await page.locator('.build-panel .entry-ref-badge--match').count(), VARIANT_COUNTS.identical);
    check('differs badges on the active side',
      await page.locator('.build-panel .entry-ref-badge--diff').count(), VARIANT_COUNTS.differing);
    // The reference side mirrors the same verdicts.
    check('in-both badges on the reference side',
      await page.locator('.reference-panel .entry-ref-badge--match').count(), VARIANT_COUNTS.identical);
    check('differs badges on the reference side',
      await page.locator('.reference-panel .entry-ref-badge--diff').count(), VARIANT_COUNTS.differing);
    // 8 active-only + 3 reference-only entries have no counterpart, so no badge.
    check('unmatched entries carry no badge',
      34 - await page.locator('.build-panel .entry-ref-badge--header').count(), VARIANT_COUNTS.activeOnly);
  }),

  // Regression for the folders × crosstalk pass: cloneEntry drops folderId,
  // because a folder belongs to its source book.
  //
  // A single copy can't prove this — an entry carrying a dangling folderId
  // renders top-level anyway, by design. The round trip can: copy a filed entry
  // out to the reference book and straight back. If the clone kept its
  // folderId, the returning copy would silently re-file itself into the folder
  // it came from, and that folder would end up with two entries.
  scenario('Crosstalk: a copied entry does not smuggle its folder back home', async (page, check) => {
    await pairCrosstalk(page);
    await enterSelectMode(page);

    // File the first active entry into a new folder.
    await selectCards(page, '.build-panel', [0]);
    await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).click();
    await page.locator('.bulk-type-chip', { hasText: 'New folder' }).click();
    await page.waitForTimeout(250);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
    check('one entry is filed', await page.locator('.build-panel .folder-entries .entry-card').count(), 1);

    // Copy it out to the reference book.
    await selectCards(page, '.build-panel', [0]);
    await page.locator('.bulk-action-apply', { hasText: 'Copy to Reference' }).click();
    await page.waitForTimeout(350);
    check('reference book gained the copy',
      await page.locator('.reference-entry-card').count(), VARIANT_COUNTS.total + 1);
    check('no folder followed it across',
      await page.locator('.reference-panel .folder-header').count(), 0);

    // Copy that clone back. Selecting on the reference side flips the copy
    // direction, so no swap is needed.
    const refCards = page.locator('.reference-entry-card');
    await refCards.nth(VARIANT_COUNTS.total).click();
    await page.waitForTimeout(200);
    await page.locator('.bulk-action-apply', { hasText: 'Copy to Active' }).click();
    await page.waitForTimeout(400);

    check('active book gained the return copy', await page.locator('.build-panel .entry-card').count(), 35);
    check('the folder still holds exactly one entry',
      await page.locator('.build-panel .folder-entries .entry-card').count(), 1);
    check('and there is still just the one folder',
      await page.locator('.build-panel .folder-header').count(), 1);
  }),

  // The cross-match sorts partition the list by which entries exist in both
  // books. Folders regroup the list, which would destroy that partition, so
  // they're suppressed and their controls disable while such a sort is active.
  scenario('Crosstalk: cross-match sort suppresses folders', async (page, check) => {
    await pairCrosstalk(page);
    await enterSelectMode(page);
    await selectCards(page, '.build-panel', [0]);
    await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).click();
    await page.locator('.bulk-type-chip', { hasText: 'New folder' }).click();
    await page.waitForTimeout(250);
    await page.keyboard.press('Enter');
    await page.locator('.search-mode-select').first().selectOption('search');
    await page.waitForTimeout(200);
    check('folder renders under the default sort',
      await page.locator('.build-panel .folder-header').count(), 1);

    // Switch to "In both books first".
    await page.locator('.sort-btn').first().click();
    await page.locator('.sort-dropdown-item', { hasText: 'In both books first' }).click();
    await page.waitForTimeout(300);
    check('folders are hidden under a cross-match sort',
      await page.locator('.build-panel .folder-header').count(), 0);
    check('every entry still renders, just unfiled',
      await page.locator('.build-panel .entry-card').count(), 34);
    check('the ＋ Folder button disables itself',
      await page.locator('.filter-action-btn', { hasText: 'Folder' }).isDisabled(), true);
    // The partition itself: the first card must be one that exists in both books.
    check('a cross-match entry sorts to the top',
      await page.locator('.build-panel .entry-card').first().locator('.entry-ref-badge--header').count(), 1);

    // Back to default and the folder returns.
    await page.locator('.sort-btn').first().click();
    await page.locator('.sort-dropdown-item', { hasText: 'Default' }).first().click();
    await page.waitForTimeout(300);
    check('folders come back on the default sort',
      await page.locator('.build-panel .folder-header').count(), 1);
  }),

  // The accepted 11A limitation, pinned as a test: the reference panel has its
  // own read-only renderer and shows a flat list. If that ever changes, this
  // check tells us rather than us discovering it by accident.
  scenario('Crosstalk: reference side renders folders flat (known limitation)', async (page, check) => {
    await pairCrosstalk(page);
    await enterSelectMode(page);
    await selectCards(page, '.build-panel', [0]);
    await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).click();
    await page.locator('.bulk-type-chip', { hasText: 'New folder' }).click();
    await page.waitForTimeout(250);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    check('the active side has a folder', await page.locator('.build-panel .folder-header').count(), 1);
    check('the reference side has none',   await page.locator('.reference-panel .folder-header').count(), 0);
    // Reference-side selections can't reach the folder bulk ops — that used to
    // be able to mint a stray empty folder in the active book.
    await page.locator('.reference-entry-card').first().click();
    await page.waitForTimeout(200);
    check('Move to folder disables for a reference-side selection',
      await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).isDisabled(), true);
    check('and no stray folder appeared',
      await page.locator('.build-panel .folder-header').count(), 1);
  }),

  // The variant's edited descriptions must actually differ, or the "differs"
  // verdicts above would be meaningless.
  scenario('Crosstalk: the variant fixture really does differ', async (page, check) => {
    await pairCrosstalk(page);
    await page.locator('.search-input').first().fill(VARIANT_MARKER.slice(0, 24));
    await page.waitForTimeout(400);
    // The marker only exists in the variant, so the active side finds nothing
    // while the reference side finds every edited entry.
    check('marker absent from the active book',
      await page.locator('.build-panel .entry-card').count(), 0);
    check('marker present on 10 reference entries',
      await page.locator('.reference-entry-card').count(), 10);
  }),
];

export async function runAllChecks() {
  console.log(`Fixture: ${FIXTURE}`);
  const outcomes = [];
  for (const s of SCENARIOS) outcomes.push(await runScenario(s));
  const passed = outcomes.filter(Boolean).length;
  console.log(`\n${passed}/${outcomes.length} scenarios passed`);
  return outcomes.every(Boolean);
}

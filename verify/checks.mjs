// Behavioural checks for the Public/Private + Hide-from-Export features, driven
// against the real dev server through verify/driver.mjs. Each scenario runs in a
// fresh browser so state never leaks between them. Values are anchored to the
// committed fixture (fixtures/reika-test-book.json): 34 entries, 29 public / 5
// private, 0 hidden-from-export.
import { launch, openBuilderWithFixture, enterSelectMode, exportJson, countPrivate, openSettings, FIXTURE } from './driver.mjs';

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
    await page.locator('.settings-section-header', { hasText: 'Hotkeys' }).click();
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
];

export async function runAllChecks() {
  console.log(`Fixture: ${FIXTURE}`);
  const outcomes = [];
  for (const s of SCENARIOS) outcomes.push(await runScenario(s));
  const passed = outcomes.filter(Boolean).length;
  console.log(`\n${passed}/${outcomes.length} scenarios passed`);
  return outcomes.every(Boolean);
}

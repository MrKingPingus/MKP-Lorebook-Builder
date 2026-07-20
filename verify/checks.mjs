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
];

export async function runAllChecks() {
  console.log(`Fixture: ${FIXTURE}`);
  const outcomes = [];
  for (const s of SCENARIOS) outcomes.push(await runScenario(s));
  const passed = outcomes.filter(Boolean).length;
  console.log(`\n${passed}/${outcomes.length} scenarios passed`);
  return outcomes.every(Boolean);
}

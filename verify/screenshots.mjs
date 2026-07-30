// Annotated feature screenshots, driven through the real app.
//
// Not part of `npm run verify` — this is a release-notes tool. Run it with
// `node verify/screenshots.mjs [outdir]`; it builds each scene, pins numbered
// badges to real controls, and writes PNGs clipped to the app window.
//
// Badges are injected into the page and positioned from each target's actual
// getBoundingClientRect, rather than painted onto the PNG afterwards at
// coordinates guessed from a screenshot. That way an annotation cannot drift
// from the thing it points at, and it stays sharp at any device scale.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  launch, openBuilderWithFixture, enterSelectMode, selectCards, settle,
  openSettings, openSettingsSection, importBookAsNew, openScaleMenu,
  VARIANT_FIXTURE, FIXTURE,
} from './driver.mjs';
import { TOUR_RELEASE, TOUR_STEPS, TOUR_CAPTURE_SCALE } from '../src/constants/tour-steps.js';

// Straight into public/ so the built site serves them, namespaced by release:
// the 0.9.0 images stay correct for 0.9.0 even after the UI moves on.
const OUT = process.argv[2] || join(process.cwd(), 'public', 'screenshots', TOUR_RELEASE);
const SCALE = TOUR_CAPTURE_SCALE;

// ── annotation layer ────────────────────────────────────────────────────────
// `marks` is [{ selector, label, place }]; place is where the badge sits
// relative to the target ('left' | 'right'). Badges are numbered in order and
// the labels are listed in a legend strip along the bottom.
async function annotate(page, marks, { title, legendOffset = 14 } = {}) {
  const missed = await page.evaluate(({ marks, title, legendOffset }) => {
    document.querySelectorAll('.shot-anno').forEach((n) => n.remove());

    const layer = document.createElement('div');
    layer.className = 'shot-anno';
    Object.assign(layer.style, {
      position: 'fixed', inset: '0', zIndex: '99999', pointerEvents: 'none',
      font: '600 13px ui-sans-serif, system-ui, -apple-system, sans-serif',
    });

    const ACCENT = '#ff5c8a';
    const legendRows = [];
    const missed = [];

    // Resolve every mark to a rect and a badge position FIRST, then number them
    // in reading order — top to bottom, left to right within a row. Numbering in
    // the order the marks happen to be written in the script produced badges
    // that ran 3, 2, 1 down the image while the legend counted 1, 2, 3.
    const resolved = [];
    for (const m of marks) {
      const all = document.querySelectorAll(m.selector);
      const el = all[m.nth ?? 0];
      const r = el && el.getBoundingClientRect();
      if (!el || (r.width === 0 && r.height === 0)) { missed.push(m.selector); continue; }
      const place = m.place || 'left';
      const cx = r.left + r.width / 2 - 11;
      const cy = r.top + r.height / 2 - 11;
      const pos = {
        left:   { left: r.left - 30, top: cy },
        right:  { left: r.right + 8, top: cy },
        top:    { left: cx, top: r.top - 30 },
        bottom: { left: cx, top: r.bottom + 8 },
      }[place];
      resolved.push({ m, r, pos });
    }

    // Band the y coordinate so two badges on the same visual row sort by x
    // rather than by a couple of stray pixels of vertical difference.
    resolved.sort((a, b) => {
      const band = (v) => Math.round(v / 24);
      return band(a.pos.top) - band(b.pos.top) || a.pos.left - b.pos.left;
    });

    resolved.forEach(({ m, r, pos }, i) => {
      const n = i + 1;

      // Ring around the target — skippable, because a ring drawn tight around a
      // row sits exactly on top of the thin drop-indicator line and hides the
      // very thing the annotation is pointing at.
      if (m.ring !== false) {
        const ring = document.createElement('div');
        ring.className = 'shot-mark';
        Object.assign(ring.style, {
          position: 'fixed',
          left: `${r.left - 3}px`, top: `${r.top - 3}px`,
          width: `${r.width + 6}px`, height: `${r.height + 6}px`,
          border: `2px solid ${ACCENT}`, borderRadius: '7px',
          boxShadow: `0 0 0 3px rgba(255,92,138,0.18)`,
        });
        layer.appendChild(ring);
      }

      const badge = document.createElement('div');
      badge.className = 'shot-mark';
      badge.textContent = String(n);
      Object.assign(badge.style, {
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: '22px', height: '22px', borderRadius: '50%',
        background: ACCENT, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: '700',
        boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
      });
      layer.appendChild(badge);
      legendRows.push(`${n}. ${m.label}`);
    });

    // Legend strip across the bottom of the window.
    const win = document.querySelector('.floating-window');
    const wr = win ? win.getBoundingClientRect() : { left: 40, right: innerWidth - 40, bottom: innerHeight - 40 };
    const legend = document.createElement('div');
    legend.className = 'shot-legend';
    Object.assign(legend.style, {
      position: 'fixed',
      left: `${wr.left + 14}px`, width: `${wr.right - wr.left - 28}px`,
      bottom: `${innerHeight - wr.bottom + legendOffset}px`,
      // Fully opaque: at 94% the entry rows behind it bled through and made the
      // legend hard to read.
      background: '#0f1015', color: '#e8e9ee',
      border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px',
      padding: '10px 14px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: '3px',
      font: '500 12.5px ui-sans-serif, system-ui, -apple-system, sans-serif',
      lineHeight: '1.45',
    });
    if (title) {
      const h = document.createElement('div');
      h.textContent = title;
      Object.assign(h.style, { fontWeight: '700', fontSize: '13px', marginBottom: '2px', color: '#fff' });
      legend.appendChild(h);
    }
    for (const row of legendRows) {
      const d = document.createElement('div');
      d.textContent = row;
      Object.assign(d.style, { color: '#c7c9d4' });
      legend.appendChild(d);
    }
    layer.appendChild(legend);
    document.body.appendChild(layer);
    return missed;
  }, { marks, title, legendOffset });
  for (const sel of missed) console.log(`  !! no match for ${sel} — annotation dropped`);
  await page.waitForTimeout(120);
}

// Wait for a state the shot depends on, and say so loudly if it never arrives.
// Drag indicators only exist while the mouse is held, so a missed one silently
// produces a screenshot of nothing in particular.
async function expect(page, selector, what) {
  try {
    await page.locator(selector).first().waitFor({ state: 'attached', timeout: 2500 });
  } catch {
    console.log(`  !! ${what}: ${selector} never appeared`);
  }
}

// Capture the app window plus the legend beneath it, with a little margin.
async function shot(page, name) {
  const box = await page.evaluate(() => {
    const win = document.querySelector('.floating-window').getBoundingClientRect();
    let { left, top, right, bottom } = win;
    // Menus are portalled to <body> and can overhang the window edge; a clip of
    // the window alone would slice them in half.
    // Popovers are portalled to <body> and can overhang the window edge; badges
    // and rings sit outside their targets by design and can overhang too. Both
    // have to be inside the clip or the shot cuts an annotation in half.
    for (const el of document.querySelectorAll('.type-filter-popover, .folder-nest-menu, .shot-mark')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      left = Math.min(left, r.left); top = Math.min(top, r.top);
      right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
  });
  const pad = 14;
  await page.screenshot({
    path: join(OUT, `${name}.png`),
    clip: {
      x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
      width: box.width + pad * 2, height: box.height + pad * 2,
    },
  });
  console.log(`  wrote ${name}.png`);
}

// ── shared scene setup ──────────────────────────────────────────────────────
// Folders are built by entry *name*, not list index: filing entries reorders
// the list, so indices captured beforehand stop meaning what they meant.
async function selectByName(page, names) {
  for (const name of names) {
    await page.locator('.build-panel .entry-card .entry-label', { hasText: name }).first().click();
    await settle(page, 90);
  }
  await settle(page, 120);
}

async function makeFolder(page, names, folderName) {
  await enterSelectMode(page);
  await selectByName(page, names);
  await page.locator('.bulk-action-apply', { hasText: 'Move to folder' }).click();
  await page.locator('.bulk-type-chip', { hasText: 'New folder' }).click();
  await settle(page, 300);
  await page.keyboard.type(folderName);
  await page.keyboard.press('Enter');
  await page.locator('.search-mode-select').first().selectOption('search');
  await settle(page, 300);
}

async function nestFolder(page, child, parent) {
  await page.locator('.folder-header', { hasText: child }).first().locator('.folder-nest-btn').click();
  await settle(page, 250);
  await page.locator('.folder-nest-item', { hasText: parent }).first().click();
  await settle(page, 450);
}

// A small, coherent structure: the Mill is a location, so it nests inside one.
async function scene(page) {
  await openBuilderWithFixture(page);
  await makeFolder(page, [
    'The Lichtenburg Mill', 'Lichtenburg Mill - Entryway',
    'Lichtenburg Mill - Production Floor', 'Lichtenburg Mill - Yard',
  ], 'The Mill');
  await makeFolder(page, ["Akaya's Apartment", 'Ashika City'], 'Locations');
  await nestFolder(page, 'The Mill', 'Locations');
  await settle(page, 300);
}

// Every scene is keyed by the step id in constants/tour-steps.js, and the file
// it writes is that step's `file`. A step with no scene here, or a scene whose
// id isn't in the list, is reported rather than silently skipped — a tour with
// a missing image is worse than one with a missing step.
const SCENES = {
  'title-menu': async (page) => {
    await openBuilderWithFixture(page);
    await importBookAsNew(page, VARIANT_FIXTURE);
    await settle(page, 400);
    await page.locator('.title-field').click();
    await page.locator('.title-menu').waitFor({ timeout: 4000 });
    await settle(page, 350);
    await annotate(page, [
      { selector: '.title-menu .tm-book--active', label: 'Every lorebook you have saved — most recent first' },
      { selector: '.title-menu .tm-sort-btn', nth: 1, label: 'Switch to A–Z if you would rather find them by name', place: 'right' },
      { selector: '.title-menu .tm-new', label: 'Start a new lorebook' },
      { selector: '.title-menu .drop-zone', label: 'Drop a file here to import, or click to browse', place: 'right' },
      { selector: '.title-menu .tm-btn-row', label: 'Download this book as JSON, TXT or DOCX', place: 'right' },
    ], { title: 'Your lorebooks live in the title' });
  },

  import: async (page) => {
    await openBuilderWithFixture(page);
    await settle(page, 300);
    await page.locator('.title-field').click();
    await page.locator('.title-menu').waitFor({ timeout: 4000 });
    await page.locator('.title-menu .drop-zone input[type="file"]').setInputFiles(VARIANT_FIXTURE);
    await expect(page, '.import-flow-grid', 'import disposition step');
    await settle(page, 400);
    await annotate(page, [
      { selector: '.import-flow-title', label: 'The file you picked, and how many entries it holds' },
      { selector: '.import-flow-opt', nth: 0, label: 'Import as new — your current book is untouched', place: 'right' },
      { selector: '.import-flow-opt', nth: 2, label: 'Replace overwrites what is there now', place: 'right' },
      { selector: '.import-flow-opt', nth: 3, label: 'Back up first downloads a copy, then replaces', place: 'right' },
      { selector: '.tm-rail-back', label: 'Back to your lorebooks' },
    ], { title: 'Importing asks what you want' });
  },

  'status-bar': async (page) => {
    await openBuilderWithFixture(page);
    await settle(page, 400);
    await annotate(page, [
      { selector: '.status-save', label: 'Whether your work is saved, and how long ago' },
      { selector: '.status-count', label: 'How many entries this lorebook holds' },
      { selector: '.status-version', label: 'Which build you are running — quote this in a bug report' },
      { selector: '.status-right .storage-usage-ring', label: 'Browser storage in use; click for a breakdown' },
      { selector: '.status-item', label: 'Every size setting lives here' },
    ], { title: 'The bar along the bottom', legendOffset: 96 });
  },

  'size-menu': async (page) => {
    await openBuilderWithFixture(page);
    await settle(page, 300);
    await openScaleMenu(page);
    await page.locator('.scale-row[aria-haspopup]').first().hover();
    await expect(page, '.scale-flyout', 'size submenu');
    await settle(page, 400);
    await annotate(page, [
      { selector: '.scale-flyout', label: 'Named presets, or Custom… to type exact numbers', place: 'right' },
      { selector: '.scale-menu', label: 'Each row shows its current value without opening anything', place: 'left' },
    ], { title: 'One place for every size', legendOffset: 96 });
  },

  settings: async (page) => {
    await openBuilderWithFixture(page);
    await openSettings(page);
    await settle(page, 400);
    await annotate(page, [
      { selector: '.settings-search-input', label: 'Finds a control even if you do not know its exact name', place: 'left' },
      { selector: '.settings-section-title', nth: 0, label: 'What happens as you write', place: 'left' },
      { selector: '.settings-section-title', nth: 2, label: 'How you drive the app — shortcuts, hotbar, folders', place: 'left' },
    ], { title: 'Settings is four sections now' });
  },

  'pull-tab': async (page) => {
    await openBuilderWithFixture(page);
    await importBookAsNew(page, VARIANT_FIXTURE);
    await settle(page, 300);
    await page.locator('.lorebook-tab').click();
    await expect(page, '.menu-panel .switcher-list', 'lorebook side panel');
    await settle(page, 600);
    await annotate(page, [
      { selector: '.lorebook-tab', label: 'Click the tab to open and close the panel', place: 'right' },
      { selector: '.menu-panel .switcher-list', label: 'Your lorebooks, beside your entries rather than over them', place: 'left' },
      { selector: '.entry-card', nth: 0, label: 'The entry list keeps its width — the window grew instead', place: 'left' },
    ], { title: 'The pull tab on the right edge' });
  },
};

async function main() {
  mkdirSync(OUT, { recursive: true });

  const missingScene = TOUR_STEPS.filter((s) => !SCENES[s.id]).map((s) => s.id);
  const orphanScene  = Object.keys(SCENES).filter((id) => !TOUR_STEPS.some((s) => s.id === id));
  for (const id of missingScene) console.log(`!! tour step "${id}" has no scene — no image will be written`);
  for (const id of orphanScene)  console.log(`!! scene "${id}" is not in TOUR_STEPS — its image is unused`);

  const { browser, page } = await launch({ width: 1500, height: 1150, deviceScaleFactor: SCALE });

  for (const step of TOUR_STEPS) {
    const build = SCENES[step.id];
    if (!build) continue;
    await build(page);
    await shot(page, step.file.replace(/\.png$/, ''));
  }

  await browser.close();
  console.log(`\nScreenshots in ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

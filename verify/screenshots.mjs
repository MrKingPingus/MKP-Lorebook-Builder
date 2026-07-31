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
  setScaleOption, closeScaleMenu, VARIANT_FIXTURE, FIXTURE,
} from './driver.mjs';
import { TOUR_RELEASE, TOUR_STEPS, TOUR_CAPTURE_SCALE } from '../src/constants/tour-steps.js';

// Straight into public/ so the built site serves them, namespaced by release:
// the 0.9.0 images stay correct for 0.9.0 even after the UI moves on.
const OUT = process.argv[2] || join(process.cwd(), 'public', 'screenshots', TOUR_RELEASE);
const SCALE = TOUR_CAPTURE_SCALE;

// ── annotation layer ────────────────────────────────────────────────────────
// `marks` is [{ selector, label, place }]; place is where the badge sits
// relative to the target ('left' | 'right'). Badges are numbered in order and
// Badges only — no legend strip. The labels are rendered as real HTML by the
// tour (from the same TOUR_STEPS entry), which keeps them out of the image
// entirely. Painted in, a legend pinned to the window's bottom edge covered
// whatever the shot was about whenever that sat low — the sizing menu, for one —
// and it disappeared the moment someone enlarged the image, taking the
// explanation with it.
async function annotate(page, marks) {
  const missed = await page.evaluate(({ marks }) => {
    document.querySelectorAll('.shot-anno').forEach((n) => n.remove());

    const layer = document.createElement('div');
    layer.className = 'shot-anno';
    Object.assign(layer.style, {
      position: 'fixed', inset: '0', zIndex: '99999', pointerEvents: 'none',
      font: '600 13px ui-sans-serif, system-ui, -apple-system, sans-serif',
    });

    const ACCENT = '#ff5c8a';
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
    });

    document.body.appendChild(layer);
    return missed;
  }, { marks });
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

// Capture the app window and anything overhanging it, with a little margin.
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
// Pin the window to its documented default before capturing.
//
// Bootstrap sizes a first-run window from the viewport — two thirds of its
// width, and its full height — so on the generator's 1500x1050 canvas the app
// came out 1000x1150. Every shot was therefore of a window no user's default
// looks like, and the extra 250px of height was what made the images too tall
// to read in the tour. Choosing the preset drives the real UI, so the captures
// track the default if it ever changes.
async function useDefaultWindow(page) {
  await openScaleMenu(page);
  await setScaleOption(page, 'Window size', 'Medium');
  await closeScaleMenu(page);
  await settle(page, 400);
}

const SCENES = {
  'title-menu': async (page) => {
    await openBuilderWithFixture(page);
    await importBookAsNew(page, VARIANT_FIXTURE);
    await useDefaultWindow(page);
    await page.locator('.title-field').click();
    await page.locator('.title-menu').waitFor({ timeout: 4000 });
    await settle(page, 350);
  },

  import: async (page) => {
    await openBuilderWithFixture(page);
    await useDefaultWindow(page);
    await page.locator('.title-field').click();
    await page.locator('.title-menu').waitFor({ timeout: 4000 });
    await page.locator('.title-menu .drop-zone input[type="file"]').setInputFiles(VARIANT_FIXTURE);
    await expect(page, '.import-flow-grid', 'import disposition step');
    await settle(page, 400);
  },

  'status-bar': async (page) => {
    await openBuilderWithFixture(page);
    await useDefaultWindow(page);
  },

  'size-menu': async (page) => {
    await openBuilderWithFixture(page);
    await useDefaultWindow(page);
    await openScaleMenu(page);
    await page.locator('.scale-row[aria-haspopup]').first().hover();
    await expect(page, '.scale-flyout', 'size submenu');
    await settle(page, 400);
  },

  settings: async (page) => {
    await openBuilderWithFixture(page);
    await useDefaultWindow(page);
    await openSettings(page);
    await settle(page, 400);
  },

  'pull-tab': async (page) => {
    await openBuilderWithFixture(page);
    await importBookAsNew(page, VARIANT_FIXTURE);
    await useDefaultWindow(page);
    await page.locator('.lorebook-tab').click();
    await expect(page, '.menu-panel .switcher-list', 'lorebook side panel');
    await settle(page, 600);
  },
};

async function main() {
  mkdirSync(OUT, { recursive: true });

  const missingScene = TOUR_STEPS.filter((s) => !SCENES[s.id]).map((s) => s.id);
  const orphanScene  = Object.keys(SCENES).filter((id) => !TOUR_STEPS.some((s) => s.id === id));
  for (const id of missingScene) console.log(`!! tour step "${id}" has no scene — no image will be written`);
  for (const id of orphanScene)  console.log(`!! scene "${id}" is not in TOUR_STEPS — its image is unused`);

  const { browser, page } = await launch({ width: 1500, height: 1050, deviceScaleFactor: SCALE });

  for (const step of TOUR_STEPS) {
    const build = SCENES[step.id];
    if (!build) continue;
    await build(page);
    await annotate(page, step.marks ?? []);
    await shot(page, step.file.replace(/\.png$/, ''));
  }

  await browser.close();
  console.log(`\nScreenshots in ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

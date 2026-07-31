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

// Menus portalled to <body> that can sit outside the window frame, plus the
// pull tab, which lives outside it by design. Both the clip and the badge
// placement need this list: one so a menu isn't sliced in half, the other so a
// badge belonging to something outside the window isn't judged out of bounds.
const PORTALS = [
  '.title-menu', '.scale-menu', '.scale-flyout',
  '.type-filter-popover', '.folder-nest-menu', '.lorebook-tab',
];

// ── annotation layer ────────────────────────────────────────────────────────
// `marks` is [{ selector, label, nth, place, ring }]. Only badges are drawn —
// no legend. The labels are rendered as real HTML by the tour from the same
// TOUR_STEPS entry, which keeps them out of the image entirely: painted in, a
// legend pinned to the window's bottom edge covered whatever the shot was about
// whenever that sat low, and it vanished the moment someone enlarged the image.
//
// Two rules here, both learned from images that came out wrong:
//
// 1. BADGES ARE NUMBERED IN ARRAY ORDER. The tour renders the same array as a
//    numbered list counting from 1, so nothing may renumber them here. A
//    previous version sorted the marks into reading order before numbering, and
//    every badge on a step ended up pointing at a different label than its
//    number. The array is the only authority; the reading-order check at the end
//    reports a mismatch rather than quietly correcting it.
//
// 2. A badge tucks against a corner of its own ring, outside it. Pinned to the
//    midpoint of an edge it landed on whatever sat beside the target — the
//    neighbouring cell of the 2x2 import grid, the label of the next status
//    item — and for a target at the window's left edge it fell outside the frame
//    altogether. `place` names the preferred corner ('tl' | 'tr' | 'bl' | 'br'),
//    but every corner is scored: a badge that would cover another marked
//    control, or another badge, or land outside the shot, steps aside on its own.
async function annotate(page, marks) {
  const report = await page.evaluate(({ marks, PORTALS }) => {
    document.querySelectorAll('.shot-anno').forEach((n) => n.remove());

    const layer = document.createElement('div');
    layer.className = 'shot-anno';
    Object.assign(layer.style, {
      position: 'fixed', inset: '0', zIndex: '99999', pointerEvents: 'none',
      font: '600 13px ui-sans-serif, system-ui, -apple-system, sans-serif',
    });

    const ACCENT = '#ff5c8a';
    const BADGE = 22;  // badge diameter
    const RING = 3;    // how far the ring sits outside its target
    const GAP = 4;     // clear air between ring and badge
    const CORNERS = ['tl', 'tr', 'bl', 'br'];

    const box = (r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    const grow = (r, by) => ({
      left: r.left - by, top: r.top - by, right: r.right + by, bottom: r.bottom + by,
    });
    const hits = (a, b) =>
      a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const holds = (outer, inner) =>
      inner.left >= outer.left && inner.right <= outer.right
      && inner.top >= outer.top && inner.bottom <= outer.bottom;
    const merge = (a, b) => ({
      left: Math.min(a.left, b.left), top: Math.min(a.top, b.top),
      right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom),
    });

    // Resolve targets up front. A mark matching nothing is reported rather than
    // shifting the number of every mark after it.
    const missed = [];
    const targets = [];
    for (const m of marks) {
      const el = document.querySelectorAll(m.selector)[m.nth ?? 0];
      const r = el && el.getBoundingClientRect();
      if (!el || (r.width === 0 && r.height === 0)) { missed.push(m.selector); continue; }
      targets.push({ m, r });
    }

    // Where a badge is allowed to sit: the window, plus anything portalled
    // outside it, plus the targets themselves.
    let region = box(document.querySelector('.floating-window').getBoundingClientRect());
    for (const sel of PORTALS) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width > 0) region = merge(region, r);
      }
    }
    for (const { r } of targets) region = merge(region, r);

    const placed = [];
    targets.forEach(({ m, r }, i) => {
      const ring = grow(r, RING);

      // Ring around the target — skippable, because a ring drawn tight around a
      // row sits exactly on top of the thin drop-indicator line and hides the
      // very thing the annotation is pointing at.
      if (m.ring !== false) {
        const el = document.createElement('div');
        el.className = 'shot-mark';
        Object.assign(el.style, {
          position: 'fixed',
          left: `${ring.left}px`, top: `${ring.top}px`,
          width: `${r.width + RING * 2}px`, height: `${r.height + RING * 2}px`,
          border: `2px solid ${ACCENT}`, borderRadius: '7px',
          boxShadow: '0 0 0 3px rgba(255,92,138,0.18)',
        });
        layer.appendChild(el);
      }

      // The author's corner first, then the rest; ties break towards the
      // author's preference because `rank` is part of the cost.
      const wanted = [m.place, ...CORNERS].filter((c, n, all) => c && all.indexOf(c) === n);
      let best = null;
      wanted.forEach((corner, rank) => {
        const left = corner[1] === 'l' ? ring.left - GAP - BADGE : ring.right + GAP;
        const top  = corner[0] === 't' ? ring.top - GAP - BADGE  : ring.bottom + GAP;
        const at = { left, top, right: left + BADGE, bottom: top + BADGE };
        let cost = rank;
        if (!holds(region, at)) cost += 1000;
        targets.forEach(({ r: other }, j) => { if (j !== i && hits(at, grow(other, RING))) cost += 100; });
        placed.forEach((p) => { if (hits(at, p)) cost += 60; });
        if (!best || cost < best.cost) best = { at, cost };
      });
      placed.push(best.at);

      const badge = document.createElement('div');
      badge.className = 'shot-mark';
      badge.textContent = String(i + 1);
      Object.assign(badge.style, {
        position: 'fixed',
        left: `${best.at.left}px`, top: `${best.at.top}px`,
        width: `${BADGE}px`, height: `${BADGE}px`, borderRadius: '50%',
        background: ACCENT, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: '700',
        boxShadow: '0 2px 6px rgba(0,0,0,0.45)',
      });
      layer.appendChild(badge);
    });

    document.body.appendChild(layer);

    // Do the badges scan in the order the list counts? Band the y so two badges
    // on one visual row sort by x rather than by a few stray pixels.
    const band = (v) => Math.round(v / 24);
    const reading = placed.map((_, i) => i).sort((a, b) =>
      band(placed[a].top) - band(placed[b].top) || placed[a].left - placed[b].left);
    return {
      missed,
      reading: reading.every((v, i) => v === i) ? null : reading.map((i) => i + 1),
    };
  }, { marks, PORTALS });

  for (const sel of report.missed) console.log(`  !! no match for ${sel} — annotation dropped`);
  if (report.reading) {
    console.log(`  !! badges scan ${report.reading.join(', ')} — reorder this step's marks to match`);
  }
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
//
// `crop` narrows that vertically to the part of the window the step is actually
// about: { top, bottom } are selectors, `padTop`/`padBottom` keep some of the
// surrounding window for context. Full width is always kept, so a cropped shot
// still reads as a band across the builder rather than a floating fragment.
// Without this, a step about the status bar was a 40px strip at the bottom of a
// 900px-tall image of an entry list — the subject was there, but nobody could
// see it.
async function shot(page, name, crop = {}) {
  const box = await page.evaluate(({ crop, PORTALS }) => {
    const win = document.querySelector('.floating-window').getBoundingClientRect();
    let { left, top, right, bottom } = win;
    // Menus portalled to <body> can overhang the window edge, and rings and
    // badges sit outside their targets by design. Both have to be inside the
    // clip or the shot cuts an annotation in half.
    for (const el of document.querySelectorAll([...PORTALS, '.shot-mark'].join(', '))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      left = Math.min(left, r.left); top = Math.min(top, r.top);
      right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
    }
    // The crop wins over the union above — that is the point of asking for one.
    const edge = (sel) => {
      const el = sel && document.querySelector(sel);
      return el ? el.getBoundingClientRect() : null;
    };
    const from = edge(crop.top);
    const to = edge(crop.bottom);
    if (from) top = from.top - (crop.padTop ?? 0);
    if (to) bottom = to.bottom + (crop.padBottom ?? 0);
    return { x: left, y: top, width: right - left, height: bottom - top };
  }, { crop, PORTALS });
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

// Every scene starts from an empty browser. The generator drives one long-lived
// page and lorebooks persist in localStorage, so each scene used to inherit
// every book the scenes before it had imported — by the last shot the side panel
// listed eight near-identical copies of the same fixture.
async function emptyStorage(page) {
  if (!page.url().startsWith('http')) return;
  await page.evaluate(() => localStorage.clear());
}

// How tightly each shot is cropped, keyed by step id. Steps absent from here are
// captured whole, which is right when the subject is the window itself.
const CROPS = {
  // Both of these are about a menu hanging from the title, not about the entry
  // list filling the 900px underneath it.
  'title-menu': { bottom: '.title-menu', padBottom: 10 },
  import:       { bottom: '.title-menu', padBottom: 10 },
  // The subject is a 40px strip. Keep a slice of the list above the hotbar so it
  // still reads as the bottom of a window.
  'status-bar': { top: '.hotbar', padTop: 90 },
  // The menus stack up from the bottom-right corner; everything above the
  // flyout is entry rows.
  'size-menu':  { top: '.scale-flyout', padTop: 40 },
};

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
    console.log(`${step.id}:`);
    await emptyStorage(page);
    await build(page);
    await annotate(page, step.marks ?? []);
    await shot(page, step.file.replace(/\.png$/, ''), CROPS[step.id]);
  }

  await browser.close();
  console.log(`\nScreenshots in ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

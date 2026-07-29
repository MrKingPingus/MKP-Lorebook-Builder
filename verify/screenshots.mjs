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
  openSettings, openSettingsSection,
} from './driver.mjs';

const OUT = process.argv[2] || join(process.cwd(), 'screenshots');
const SCALE = 2;

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

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { browser, page } = await launch({ width: 1120, height: 880, deviceScaleFactor: SCALE });

  // ── 1. the folder tree ────────────────────────────────────────────────────
  await scene(page);
  await annotate(page, [
    { selector: '.folder-header .folder-swatch', label: 'Colour swatch — eight pastels, deliberately distinct from entry-type colours' },
    { selector: '.folder-header .folder-count', label: 'How many entries are inside, counting sub-folders' },
    { selector: '.folder-header .folder-add-entry-btn', label: 'Add a new entry straight into this folder', place: 'bottom' },
    { selector: '.folder-entries .folder-header', label: 'Folders nest inside folders, up to three levels deep' },
  ], { title: 'Folders — a builder-only organisation layer, never exported' });
  await shot(page, '01-folder-tree');

  // ── 2. multi-entry drag ───────────────────────────────────────────────────
  await scene(page);
  // Tuck the folder so every row in this shot fits on screen — the drag then
  // stays clear of the auto-scroll zone at the list edges.
  await page.locator('.folder-header .folder-collapse-btn').first().click();
  await settle(page, 400);

  const rows = page.locator('.entry-list > .entry-list-item .entry-label');
  await rows.nth(0).click({ modifiers: ['Shift'] });
  await settle(page, 250);
  await rows.nth(2).click({ modifiers: ['Shift'] });
  await settle(page, 350);

  const src = await page.locator('.entry-list > .entry-list-item .entry-card').nth(0)
    .locator('.drag-handle').boundingBox();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
  await page.mouse.down();
  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2 + 12, { steps: 4 });
  await settle(page, 250);
  const dst = await page.locator('.entry-list > .entry-list-item .entry-card').nth(4).boundingBox();
  await page.mouse.move(dst.x + dst.width / 2, dst.y + dst.height * 0.8, { steps: 12 });
  await settle(page, 300);
  // A second small move at the destination. One long move can land without a
  // dragover firing on the row underneath, leaving no indicator to photograph.
  await page.mouse.move(dst.x + dst.width / 2 + 6, dst.y + dst.height * 0.8, { steps: 3 });
  await settle(page, 350);
  await expect(page, '.entry-list-item--drop-after', 'drop indicator');

  await annotate(page, [
    { selector: '.entry-list-item--dragging', label: 'The whole selection travels — grab any selected row by its handle' },
    { selector: '.entry-list-item--drop-after', label: 'The blue line shows exactly where they will land, before you let go', place: 'left', ring: false },
    { selector: '.bulk-action-count', label: 'Shift+click picks a range; Ctrl+click drops one back out', place: 'left' },
  ], { title: 'Drag several entries at once — one gesture, one undo', legendOffset: 96 });
  await shot(page, '02-multi-drag');
  await page.mouse.up();
  await settle(page, 250);

  // ── 3. dropping into a folder ─────────────────────────────────────────────
  await scene(page);
  const loose = await page.locator('.entry-list > .entry-list-item .entry-card').first()
    .locator('.drag-handle').boundingBox();
  await page.mouse.move(loose.x + loose.width / 2, loose.y + loose.height / 2);
  await page.mouse.down();
  await page.mouse.move(loose.x + loose.width / 2, loose.y + loose.height / 2 + 12, { steps: 4 });
  await settle(page, 250);
  // The outer folder header: big, and far enough from the list's top edge that
  // the auto-scroll zone never gets involved.
  const head = await page.locator('.folder-header').first().boundingBox();
  await page.mouse.move(head.x + head.width * 0.45, head.y + head.height * 0.65, { steps: 12 });
  await settle(page, 300);
  await page.mouse.move(head.x + head.width * 0.5, head.y + head.height * 0.65, { steps: 3 });
  await settle(page, 350);
  await expect(page, '.folder-header--drop-into', 'folder drop outline');

  await annotate(page, [
    { selector: '.folder-header--drop-into', label: 'Drop onto a folder header to file the entry inside it' },
    { selector: '.entry-list-tail', label: 'Or drop down here to pull it out of every folder', place: 'top' },
  ], { title: 'Where you drop decides where it belongs', legendOffset: 96 });
  await shot(page, '03-drop-into-folder');
  await page.mouse.up();
  await settle(page, 250);

  // ── 4. filter by folder ───────────────────────────────────────────────────
  await scene(page);
  await page.locator('.folder-filter-btn').click();
  await settle(page, 350);
  await annotate(page, [
    { selector: '.folder-filter-btn', label: 'Folder ▾ — only appears once the book actually has folders', place: 'top' },
    // Left, so it does not stack against the count badge at the row's right edge.
    { selector: '.folder-filter-popover .type-filter-popover-row', nth: 1, label: 'Pick a folder to show only its entries, sub-folders included', place: 'left' },
    { selector: '.folder-filter-count', label: 'The count matches exactly what picking it will show', place: 'right' },
    { selector: '.folder-filter-popover .type-filter-popover-row:last-child', label: 'Unfiled entries — everything you have not put away yet', place: 'right' },
  ], { title: 'Filter the list down to one folder' });
  await shot(page, '04-folder-filter');
  await page.keyboard.press('Escape');
  await settle(page, 250);

  // ── 5. condensed rows ─────────────────────────────────────────────────────
  await scene(page);
  await openSettings(page);
  const fset = await openSettingsSection(page, 'Layout & Controls');
  await fset.locator('.settings-checkbox-row input').nth(1).check();
  await settle(page, 250);
  await page.locator('.menu-panel-close').first().click();
  await settle(page, 350);
  // One click on the inner folder now condenses it; the outer stays full size.
  await page.locator('.folder-entries .folder-header .folder-collapse-btn').first().click();
  await settle(page, 400);
  await annotate(page, [
    { selector: '.entry-card--condensed', label: 'Condensed — one line each: type dot, name, Expand and Remove' },
    { selector: '.folder-entries .folder-header .folder-collapse-btn', label: 'The header button cycles a folder through its sizes' },
    { selector: '.entry-list-item .entry-card', nth: 0, label: 'Entries outside that folder keep their full size' },
  ], { title: 'Condense a folder to scan it, without hiding it' });
  await shot(page, '05-condensed-rows');

  // ── 6. collapse-stage settings ────────────────────────────────────────────
  await openSettings(page);
  const stages = await openSettingsSection(page, 'Layout & Controls');
  // Shot 5 turned Condensed on. Put it back to the shipped default, or the
  // image would contradict its own caption.
  const condensedBox = stages.locator('.settings-checkbox-row input').nth(1);
  if (await condensedBox.isChecked()) {
    await condensedBox.uncheck();
    await settle(page, 250);
  }
  await stages.scrollIntoViewIfNeeded();
  await settle(page, 400);

  await annotate(page, [
    { selector: '.settings-checkbox-row', nth: 0, label: 'Full size is always available — every folder returns to it', place: 'left' },
    { selector: '.settings-checkbox-row', nth: 1, label: 'Condensed is off by default; tick it for a middle step', place: 'left' },
    { selector: '.settings-checkbox-row', nth: 2, label: 'Hidden tucks the entries away and shows just the count', place: 'left' },
  ], { title: 'Choose which sizes the folder button cycles through', legendOffset: 150 });
  await shot(page, '06-collapse-stages');

  await browser.close();
  console.log(`\nScreenshots in ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

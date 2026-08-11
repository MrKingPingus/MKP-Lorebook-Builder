// Generates lorebooks that sit at the app's documented limits, for the stress
// tier of the mobile suite.
//
// The committed fixtures are deliberately realistic — 34 entries of ordinary
// prose — which is exactly what a limits pass must not use. This produces books
// that are boring to read and awkward to render: every trigger slot filled, the
// description at the character cap, names far past the advisory title length.
//
// Output is *not* committed. Books are written to verify/.tmp/ at run time
// (gitignored) because nothing imports stable counts from them the way the
// crosstalk scenarios import VARIANT_COUNTS, so a checked-in 500-entry JSON
// would be a few hundred KB of repo for no reference value. The generator is
// committed and runnable standalone, which is what reproducing a failure by
// hand actually needs:
//
//   node fixtures/build-stress-book.mjs --entries 500 --out /tmp/big.json
//   node fixtures/build-stress-book.mjs --preset maxed-entry
//
// Everything is seeded, so the same arguments always produce the same book.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mirrors src/constants/limits.js and src/constants/entry-types.js. There is no
// import path from fixtures/ into src/, so these are kept in step by hand — if a
// cap moves, this file has to move with it.
export const LIMITS = {
  MAX_TRIGGERS: 25,
  CHAR_LIMIT: 1500,
  TITLE_CHAR_LIMIT: 50,
  MAX_LOREBOOKS: 50,
};

const ENTRY_TYPE_LABELS = ['Character', 'Item', 'PlotEvent', 'Location', 'Other'];

// Deterministic PRNG (mulberry32) — a fixed seed has to give a fixed book, or a
// failure found on CI cannot be reproduced locally.
function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  'ashika', 'harbour', 'lantern', 'seawall', 'archive', 'tram', 'cassette', 'rooftop',
  'monsoon', 'ferry', 'noodle', 'shrine', 'kiosk', 'alleyway', 'canal', 'observatory',
  'transit', 'foghorn', 'marigold', 'switchboard', 'terrace', 'quarry', 'lighthouse',
  'aviary', 'boardwalk', 'cannery', 'depot', 'esplanade', 'funicular', 'greenhouse',
];

function words(next, count) {
  return Array.from({ length: count }, () => WORDS[Math.floor(next() * WORDS.length)]);
}

// Prose padded to an exact character count, so a description can be pinned to
// the cap rather than merely near it.
function textOfLength(next, length) {
  let out = '';
  while (out.length < length) out += `${WORDS[Math.floor(next() * WORDS.length)]} `;
  return out.slice(0, length).trimEnd().padEnd(length, '.');
}

// Distinct trigger phrases. Triggers are de-duplicated on import, so a book
// meant to fill all 25 slots has to supply 25 *different* ones.
function distinctTriggers(next, count, salt) {
  const out = new Set();
  let i = 0;
  while (out.size < count) {
    out.add(`${words(next, 2).join(' ')} ${salt}-${i++}`);
  }
  return [...out];
}

/**
 * Build a stress book.
 *
 * @param {object}  opts
 * @param {number}  opts.entries            how many entries
 * @param {number}  opts.triggersPerEntry   triggers on each entry
 * @param {number}  opts.descriptionChars   description length, in characters
 * @param {number}  opts.nameChars          entry-name length, in characters
 * @param {number}  opts.seed               PRNG seed
 * @param {string}  opts.name               lorebook name
 */
export function buildStressBook({
  entries = 50,
  triggersPerEntry = 5,
  descriptionChars = 300,
  nameChars = 20,
  seed = 1,
  name = 'Stress Book',
} = {}) {
  const next = rng(seed);
  const out = {};

  for (let i = 1; i <= entries; i++) {
    // Names must stay distinct: the crosstalk name-match map keys on them, and a
    // book of identical names would exercise collision handling rather than the
    // length handling this is for.
    const suffix = ` #${i}`;
    const base = textOfLength(next, Math.max(1, nameChars - suffix.length));
    out[String(i)] = {
      name: `${base}${suffix}`,
      triggers: distinctTriggers(next, triggersPerEntry, i),
      description: textOfLength(next, descriptionChars),
      entryType: ENTRY_TYPE_LABELS[i % ENTRY_TYPE_LABELS.length],
      isPublic: i % 5 !== 0,
    };
  }

  return { name, entries: out };
}

// Named shapes, so a scenario says which limit it is pushing rather than
// restating a pile of numbers.
export const PRESETS = {
  // One entry with every slot filled: 25 triggers, description at the cap, and a
  // name far past the advisory title length. The densest single card possible.
  'maxed-entry': {
    entries: 1, triggersPerEntry: LIMITS.MAX_TRIGGERS,
    descriptionChars: LIMITS.CHAR_LIMIT, nameChars: 300, seed: 11,
    name: 'Maxed Entry',
  },
  // Every entry maxed, enough of them to need scrolling.
  'maxed-many': {
    entries: 40, triggersPerEntry: LIMITS.MAX_TRIGGERS,
    descriptionChars: LIMITS.CHAR_LIMIT, nameChars: 120, seed: 12,
    name: 'Maxed Many',
  },
  // Volume rather than density — the list itself under pressure.
  'bulk': {
    entries: 500, triggersPerEntry: 3, descriptionChars: 200, nameChars: 30, seed: 13,
    name: 'Bulk Book',
  },
  // Long names on short entries: isolates title truncation from everything else.
  'long-names': {
    entries: 25, triggersPerEntry: 2, descriptionChars: 80, nameChars: 240, seed: 14,
    name: 'Long Names',
  },
};

export function buildPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) throw new Error(`Unknown preset "${presetName}". Known: ${Object.keys(PRESETS).join(', ')}`);
  return buildStressBook(preset);
}

// Write a preset to disk and return the path. Scenarios need a real file because
// importing goes through a file chooser.
export function writePreset(presetName, destPath) {
  const book = buildPreset(presetName);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, JSON.stringify(book, null, 2), 'utf8');
  return destPath;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (key, fallback) => {
    const i = args.indexOf(`--${key}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };

  const presetName = flag('preset', null);
  const book = presetName
    ? buildPreset(presetName)
    : buildStressBook({
        entries: Number(flag('entries', 50)),
        triggersPerEntry: Number(flag('triggers', 5)),
        descriptionChars: Number(flag('description', 300)),
        nameChars: Number(flag('name-chars', 20)),
        seed: Number(flag('seed', 1)),
      });

  const out = flag('out', null);
  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(book, null, 2), 'utf8');
    const count = Object.keys(book.entries).length;
    console.log(`Wrote ${count} entries to ${out}`);
  } else {
    process.stdout.write(JSON.stringify(book, null, 2));
  }
}

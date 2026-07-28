// Derives fixtures/reika-test-book-variant.json from reika-test-book.json.
//
// The variant exists so the crosstalk / reference features can be verified
// against a second book whose differences are deliberate and countable, rather
// than a hand-made file whose contents drift. Regenerate with:
//
//   node fixtures/build-variant-book.mjs
//
// Groups, keyed off the primary book's 1-based entry keys:
//
//   1–10   identical               → 10 same-name pairs that compare EQUAL
//                                    ("in both ↗" badge, green tint)
//   11–20  description edited      → 10 same-name pairs that DIFFER
//   21–26  one extra trigger       →  6 same-name pairs that DIFFER
//   27–34  dropped                 →  8 entries that exist only in the active book
//   +3     invented                →  3 entries that exist only in the reference
//
// So: 26 same-name pairs (10 equal / 16 differing), 8 active-only,
// 3 reference-only, 29 entries in the variant.
//
// One invented entry ("Crosstalk Probe") deliberately reuses the trigger
// "Downtown" from the primary book's entry 1 while carrying a different name —
// that's a genuine cross-book trigger collision rather than an expected
// same-name match, which is what the trigger-crosstalk scanner should flag.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC  = fileURLToPath(new URL('./reika-test-book.json', import.meta.url));
const DEST = fileURLToPath(new URL('./reika-test-book-variant.json', import.meta.url));

export const VARIANT_GROUPS = {
  identical:      { from: 1,  to: 10 },
  descriptionEdit:{ from: 11, to: 20 },
  triggerEdit:    { from: 21, to: 26 },
  dropped:        { from: 27, to: 34 },
};

export const VARIANT_COUNTS = {
  identical:     10,
  differing:     16,   // descriptionEdit + triggerEdit
  sameName:      26,   // identical + differing
  activeOnly:     8,
  referenceOnly:  3,
  total:         29,
};

// Marker appended to edited descriptions. Distinctive enough to search for and
// to eyeball in a diff view.
export const VARIANT_MARKER = 'This version diverges from the original book.';

// The trigger the invented probe entry shares with primary entry 1.
export const SHARED_TRIGGER = 'Downtown';

const REFERENCE_ONLY = [
  {
    name: 'Crosstalk Probe',
    // Shares SHARED_TRIGGER with a differently-named active entry on purpose.
    triggers: [SHARED_TRIGGER, 'probe only'],
    description: 'Exists only in the variant book, and shares a trigger with an unrelated entry in the primary book.',
    entryType: 'Other',
    isPublic: false,
  },
  {
    name: 'Variant Only Character',
    triggers: ['variant character', 'not in primary'],
    description: 'A character that exists only in the variant book, so it has no same-name counterpart.',
    entryType: 'Character',
    isPublic: true,
  },
  {
    name: 'Variant Only Location',
    triggers: ['variant location'],
    description: 'A location that exists only in the variant book.',
    entryType: 'Location',
    isPublic: false,
  },
];

function inRange(n, { from, to }) {
  return n >= from && n <= to;
}

export function buildVariant(primary) {
  const out = {};
  let next = 1;

  for (const [key, entry] of Object.entries(primary.entries)) {
    const n = Number(key);
    if (inRange(n, VARIANT_GROUPS.dropped)) continue;

    const copy = {
      name:        entry.name,
      triggers:    [...(entry.triggers ?? [])],
      description: entry.description ?? '',
      entryType:   entry.entryType,
      isPublic:    entry.isPublic === true,
    };

    if (inRange(n, VARIANT_GROUPS.descriptionEdit)) {
      copy.description = `${copy.description} ${VARIANT_MARKER}`.trim();
    } else if (inRange(n, VARIANT_GROUPS.triggerEdit)) {
      copy.triggers.push(`variant trigger ${n}`);
    }

    out[String(next++)] = copy;
  }

  for (const entry of REFERENCE_ONLY) {
    out[String(next++)] = { ...entry, triggers: [...entry.triggers] };
  }

  return { name: `${primary.name} — Variant`, entries: out };
}

// Running the file directly regenerates the fixture; importing it just exposes
// the group definitions and expected counts to the verify scenarios.
if (process.argv[1] && process.argv[1].endsWith('build-variant-book.mjs')) {
  const primary = JSON.parse(readFileSync(SRC, 'utf8'));
  const variant = buildVariant(primary);
  const count = Object.keys(variant.entries).length;
  if (count !== VARIANT_COUNTS.total) {
    console.error(`Expected ${VARIANT_COUNTS.total} entries, produced ${count} — group ranges and VARIANT_COUNTS disagree.`);
    process.exit(1);
  }
  writeFileSync(DEST, `${JSON.stringify(variant, null, 2)}\n`);
  console.log(`Wrote ${DEST} — ${count} entries.`);
}

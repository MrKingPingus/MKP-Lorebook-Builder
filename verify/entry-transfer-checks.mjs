// Pure-logic checks for services/entry-transfer.js — copy/move between books.
//
// This suite exists mostly to pin down what a transfer is allowed to carry.
// Every field it takes or drops is a decision that is invisible until it is
// wrong months later: a folderId that came along files the entry into whatever
// folder happens to share that id in the destination, a shared id turns two
// entries into one the next time anything looks an entry up, and a dropped
// snapshots array quietly bins someone's checkpoints. None of those show up in
// the UI at the moment they happen.
import {
  transferEntries, countTransferable, moveConfirmMessage, TRANSFER_COPY, TRANSFER_MOVE,
} from '../src/services/entry-transfer.js';

function book(id, name, entries) {
  return { id, name, entries };
}
function entry(id, over = {}) {
  return {
    id,
    name: `Entry ${id}`,
    type: 'character',
    description: `body of ${id}`,
    triggers: [`t-${id}`],
    isPublic: true,
    hiddenFromExport: false,
    folderId: 'folder-in-source',
    snapshots: [{ label: 'checkpoint', description: 'old body' }],
    lastModified: 1000,
    ...over,
  };
}

export function runEntryTransferChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ entry-transfer (pure logic)');

  const src  = () => book('src', 'Source', [entry('a'), entry('b'), entry('c')]);
  const dest = () => book('dst', 'Dest',   [entry('z')]);

  // ── copy leaves the source alone ──────────────────────────────────────────
  {
    const s = src();
    const r = transferEntries(s, dest(), ['b'], TRANSFER_COPY);
    check('copy: one entry lands in the destination', r.dest.entries.length, 2);
    check('copy: the source is handed back untouched', r.source, s);
    check('copy: the source object is the SAME reference, so no needless write',
      r.source === s, true);
    check('copy: reports what it did', r.count, 1);
  }

  // ── move takes it out ─────────────────────────────────────────────────────
  {
    const r = transferEntries(src(), dest(), ['b'], TRANSFER_MOVE);
    check('move: the source loses it', r.source.entries.map((e) => e.id), ['a', 'c']);
    check('move: the destination gains it', r.dest.entries.length, 2);
  }

  // ── what travels, and what does not ───────────────────────────────────────
  {
    const r = transferEntries(src(), dest(), ['a'], TRANSFER_COPY);
    const landed = r.dest.entries.at(-1);
    check('content travels', [landed.name, landed.description, landed.triggers], ['Entry a', 'body of a', ['t-a']]);
    check('both visibility flags travel', [landed.isPublic, landed.hiddenFromExport], [true, false]);
    check('checkpoints travel (locked decision 8)', landed.snapshots.length, 1);
    check('the folder does NOT — it names a folder in the source book', landed.folderId, null);
    check('the id is regenerated, so a copy can never collide with its original',
      landed.id !== 'a', true);
    check('the triggers array is a copy, not the source\'s own',
      landed.triggers === src().entries[0].triggers, false);
  }

  // ── lastModified: fresh on a copy, preserved on a move ────────────────────
  {
    const copied = transferEntries(src(), dest(), ['a'], TRANSFER_COPY).dest.entries.at(-1);
    const moved  = transferEntries(src(), dest(), ['a'], TRANSFER_MOVE).dest.entries.at(-1);
    check('a copy is a new thing, so it is modified now', copied.lastModified > 1000, true);
    check('a move did not change the entry, so its timestamp stands', moved.lastModified, 1000);
  }

  // ── ordering ──────────────────────────────────────────────────────────────
  {
    // Ids given back to front on purpose: the result must follow the SOURCE
    // book's order, not the order the user happened to click them in.
    const r = transferEntries(src(), dest(), ['c', 'a'], TRANSFER_COPY);
    check('a multi-entry transfer keeps the source book\'s order',
      r.dest.entries.slice(1).map((e) => e.name), ['Entry a', 'Entry c']);
    check('and appends below what the destination already had',
      r.dest.entries[0].id, 'z');
  }

  // ── the no-op cases, all of which must be distinguishable from success ────
  check('no ids is a no-op',              transferEntries(src(), dest(), [], TRANSFER_COPY), null);
  check('unknown ids are a no-op',        transferEntries(src(), dest(), ['nope'], TRANSFER_COPY), null);
  check('a missing destination is a no-op', transferEntries(src(), null, ['a'], TRANSFER_COPY), null);
  check('a missing source is a no-op',    transferEntries(null, dest(), ['a'], TRANSFER_COPY), null);
  check('a book is never its own destination',
    transferEntries(src(), book('src', 'Source', []), ['a'], TRANSFER_MOVE), null);
  check('a Set of ids works as well as an array',
    transferEntries(src(), dest(), new Set(['a', 'b']), TRANSFER_COPY).count, 2);
  check('an empty source book is a no-op, not a crash',
    transferEntries(book('src', 'S', []), dest(), ['a'], TRANSFER_MOVE), null);
  check('a destination with no entries array is fine',
    transferEntries(src(), { id: 'dst', name: 'D' }, ['a'], TRANSFER_COPY).dest.entries.length, 1);

  // ── counting without a destination ────────────────────────────────────────
  // What "＋ New lorebook…" needs: a move into a book that does not exist yet
  // has to confirm BEFORE creating it, or a cancelled move leaves a stray empty
  // book behind. So the count has to be available with no destination in hand.
  check('it counts the ids that are really there',   countTransferable(src(), ['a', 'c']), 2);
  check('and ignores ones that are not',             countTransferable(src(), ['a', 'nope']), 1);
  check('no source, nothing to count',               countTransferable(null, ['a']), 0);
  check('no ids, nothing to count',                  countTransferable(src(), []), 0);
  check('it agrees with what a transfer would carry',
    countTransferable(src(), ['a', 'b']), transferEntries(src(), dest(), ['a', 'b'], TRANSFER_MOVE).count);

  // ── the move confirmation says the one thing the user cannot see ──────────
  {
    const one  = moveConfirmMessage(1, 'Side Stories');
    const many = moveConfirmMessage(4, 'Side Stories');
    check('it names the destination', one.includes('"Side Stories"'), true);
    check('it warns that undo does not reach the destination',
      one.includes('will not remove it from'), true);
    check('it counts correctly for one', one.includes('this entry'), true);
    check('and for several', many.includes('these 4 entries'), true);
  }

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} entry-transfer checks passed`);
  return results.every(Boolean);
}

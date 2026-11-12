// Copy or move entries from one lorebook into another (GitHub #127).
//
// Pure by design: it takes two lorebook objects and hands back two new ones. It
// knows nothing about stores, localStorage or React — `use-entry-transfer.js`
// owns persistence, history and the target list.
//
// Why this is not `cloneEntry` in a loop at the call site:
//
// **A move has to produce both books at once.** Taking the entry out of the
// source and appending it to the destination are one user action, and a caller
// doing them as two steps can persist half of it — the failure mode being an
// entry that exists in neither book. Returning both books together makes the
// half-applied state unrepresentable rather than merely unlikely.
//
// **The two modes differ in exactly one place**, and it is worth keeping that
// visible. Everything about which fields travel, what order they land in and
// what gets a fresh id is shared; the only difference is whether the source
// keeps its copy.
import { cloneEntry } from './entry-factory.js';

export const TRANSFER_COPY = 'copy';
export const TRANSFER_MOVE = 'move';

/**
 * @param source  lorebook the entries are coming from
 * @param dest    lorebook they are going to (must not be `source`)
 * @param ids     Set or array of entry ids in `source`
 * @param mode    TRANSFER_COPY | TRANSFER_MOVE
 * @returns { count, source, dest } — new lorebook objects — or null if the
 *          transfer would be a no-op, so callers can skip the write and the
 *          history snapshot in one check.
 */
export function transferEntries(source, dest, ids, mode) {
  if (!source || !dest) return null;
  if (source.id === dest.id) return null; // a book is never its own destination

  const wanted = ids instanceof Set ? ids : new Set(ids ?? []);
  if (wanted.size === 0) return null;

  const sourceEntries = source.entries ?? [];
  // Filtered out of the source array rather than mapped from `ids`, so a
  // multi-entry transfer lands in the order it had in the source book instead
  // of whatever order the user happened to click things in.
  const taken = sourceEntries.filter((e) => wanted.has(e.id));
  if (taken.length === 0) return null; // ids that match nothing here

  const moving = mode === TRANSFER_MOVE;
  const clones = taken.map((e) =>
    cloneEntry(e, { keepSnapshots: true, keepModified: moving })
  );

  return {
    count:  clones.length,
    source: moving
      ? { ...source, entries: sourceEntries.filter((e) => !wanted.has(e.id)) }
      : source,
    dest:   { ...dest, entries: [...(dest.entries ?? []), ...clones] },
  };
}

/**
 * How many of `ids` a transfer out of `source` would actually carry.
 *
 * Exists for one caller: transferring into a lorebook that does not exist yet
 * has to ask for confirmation BEFORE creating it, so it needs the count without
 * having a destination to hand.
 */
export function countTransferable(source, ids) {
  if (!source) return 0;
  const wanted = ids instanceof Set ? ids : new Set(ids ?? []);
  return (source.entries ?? []).filter((e) => wanted.has(e.id)).length;
}

/**
 * The text of the move confirmation (locked decision 7).
 *
 * A move is undoable on the SOURCE side only. Undo is per-book and the history
 * store only ever holds the active lorebook, so Ctrl+Z after a move puts the
 * entry back here without taking it out of the destination — you end up with
 * two. That is a surprising enough outcome to be worth spelling out at the
 * point of the decision rather than discovering afterwards, which is the only
 * reason a move asks and a copy does not.
 */
export function moveConfirmMessage(count, destName) {
  const what = count === 1 ? 'this entry' : `these ${count} entries`;
  return `Move ${what} to "${destName}"?\n\n`
    + 'Undo will bring it back here, but it will not remove it from '
    + `"${destName}" — you would be left with a copy in each book.`;
}

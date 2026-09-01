// Copy or move entries into another lorebook (GitHub #127) — target list,
// persistence, history and the move confirmation.
//
// Three things here are not obvious from the call sites.
//
// **The destination is written to storage immediately, not left to autosave.**
// Autosave only ever persists the ACTIVE lorebook (see `autosave.js`), because
// that is the only book the user can normally edit. A transfer is the case that
// breaks that assumption: it changes a book that is not on screen, and if it
// only reached the store the change would live in memory until the user
// happened to switch to that book — and would be gone if they closed the tab
// first. So every write here goes through `saveLorebook` in the same breath.
//
// **The source side is the only undoable half of a move.** The history store
// holds the active lorebook and nothing else, so the snapshot taken before a
// move restores the entry here without touching the destination. The user is
// told that before they commit; `moveConfirmMessage` is that text.
//
// **Ephemeral books are not offered as targets.** The feature tour's samples
// are in the index and in the store like any other book, but `saveLorebook`
// refuses to write them by design. Copying into one would silently evaporate,
// so they are filtered out of the list rather than allowed to fail quietly.
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useLorebook }      from './use-lorebook.js';
import { saveLorebook, saveLorebookIndex } from '../services/storage-service.js';
import { transferEntries, countTransferable, moveConfirmMessage, TRANSFER_COPY, TRANSFER_MOVE }
  from '../services/entry-transfer.js';
import { MAX_LOREBOOKS }   from '../constants/limits.js';
import { DEFAULT_LOREBOOK } from '../constants/defaults.js';

export { TRANSFER_COPY, TRANSFER_MOVE };

export function useEntryTransfer() {
  const lorebooks         = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId  = useLorebookStore((s) => s.activeLorebookId);
  const lorebookIndex     = useLorebookStore((s) => s.lorebookIndex);
  const setLorebook       = useLorebookStore((s) => s.setLorebook);
  const setLorebookIndex  = useLorebookStore((s) => s.setLorebookIndex);
  const pushSnapshot      = useHistoryStore((s) => s.pushSnapshot);
  const { createLorebook, switchLorebook } = useLorebook();

  // Index order, so the picker matches the order of the lorebook switcher the
  // user already knows rather than inventing a second ordering.
  const transferTargets = lorebookIndex
    // `lorebooks[item.id]` is not redundant with the index: App.jsx drops a book
    // whose stored blob will not parse but leaves its index row alone, so an
    // index entry can outlive the book it names. Offering one would be a target
    // that silently does nothing when clicked.
    .filter((item) => item.id !== activeLorebookId && !item.ephemeral && lorebooks[item.id])
    .map((item) => ({
      id:         item.id,
      name:       item.name,
      entryCount: lorebooks[item.id]?.entries?.length ?? 0,
    }));

  // Deliberately the same test `addToIndex` applies, ephemeral rows included, so
  // the item disables exactly when creation would fail rather than a row short
  // of it — a "＋ New lorebook…" that quietly does nothing is worse than one
  // that says why it is greyed out.
  const canCreateTarget = lorebookIndex.length < MAX_LOREBOOKS;

  /** Bump the destination's index timestamp — it genuinely was just updated,
   *  and the switcher's "2m ago" would otherwise still show the last edit. */
  function touchIndex(id) {
    const next = useLorebookStore.getState().lorebookIndex.map((item) =>
      item.id === id ? { ...item, updatedAt: Date.now() } : item
    );
    setLorebookIndex(next);
    saveLorebookIndex(next);
  }

  /**
   * Copy or move `ids` out of the ACTIVE lorebook into `destId`.
   *
   * A move confirms first (locked decision 7) unless `confirmed` says the
   * caller already asked — the confirmation lives in here rather than at the
   * call sites so neither of the two can forget it.
   *
   * @returns { count, destId, destName, mode } on success, or null if nothing
   *          moved (cancelled, empty selection, missing book).
   */
  function transferTo(ids, destId, mode, { confirmed = false } = {}) {
    const state  = useLorebookStore.getState();
    const source = state.lorebooks[state.activeLorebookId];
    const dest   = state.lorebooks[destId];
    if (!source || !dest || dest.ephemeral) return null;

    // Computed before the confirm so a transfer that would do nothing does not
    // put a dialog in front of the user first.
    const result = transferEntries(source, dest, ids, mode);
    if (!result) return null;

    if (mode === TRANSFER_MOVE && !confirmed) {
      if (!window.confirm(moveConfirmMessage(result.count, dest.name))) return null;
    }

    if (mode === TRANSFER_MOVE) {
      pushSnapshot({ entries: [...(source.entries ?? [])] });
      useLorebookStore.getState().updateActiveEntries(result.source.entries);
    }

    setLorebook(result.dest);
    saveLorebook(result.dest);
    touchIndex(destId);

    return { count: result.count, destId, destName: dest.name, mode };
  }

  /**
   * Same, into a lorebook that does not exist yet (locked decision 9). The new
   * book is created WITHOUT being activated — a transfer is a thing you do to
   * somewhere else, and yanking the user out of the book they are working in
   * would be a surprising price for filing one entry away.
   *
   * The move confirmation happens HERE, before the book exists, rather than
   * inside `transferTo`. Confirming afterwards would mean a user who declines
   * has already been given an empty stray lorebook they never asked for —
   * strictly worse than the move they just refused.
   */
  function transferToNewLorebook(ids, name, mode) {
    const trimmed = (name ?? '').trim();
    const source  = useLorebookStore.getState().lorebooks[activeLorebookId];
    const count   = countTransferable(source, ids);
    if (count === 0) return null;

    if (mode === TRANSFER_MOVE
      && !window.confirm(moveConfirmMessage(count, trimmed || DEFAULT_LOREBOOK.name))) {
      return null;
    }

    const newId = createLorebook({ silent: true, activate: false, name: trimmed || null });
    if (!newId) return null; // library full
    return transferTo(ids, newId, mode, { confirmed: true });
  }

  return {
    transferTargets,
    canCreateTarget,
    transferTo,
    transferToNewLorebook,
    goToLorebook: switchLorebook,
  };
}

// Multi-lorebook index management: add, remove, promote recent, timestamp, key allocation (max MAX_LOREBOOKS, 50)
import { MAX_LOREBOOKS } from '../constants/limits.js';

/** Allocate the smallest unused key (1-MAX_LOREBOOKS) for a new lorebook slot. */
function allocateKey(index) {
  const used = new Set(index.map((item) => item.key));
  for (let k = 1; k <= MAX_LOREBOOKS; k++) {
    if (!used.has(k)) return k;
  }
  return null; // no slots available
}

/** Add a new lorebook entry to the index. Returns updated index or null if full. */
export function addToIndex(index, lorebook) {
  // Ephemeral books are exempt from the cap. They never reach storage, so they
  // consume none of what the cap protects — and with a full library the tour
  // would otherwise fail to load its samples and show a user their own books
  // being driven, which is the exact thing the samples exist to prevent.
  const exempt = lorebook.ephemeral === true;
  if (!exempt && index.length >= MAX_LOREBOOKS) return null;
  const key = exempt ? null : allocateKey(index);
  if (!exempt && key === null) return null;
  const entry = {
    id:        lorebook.id,
    name:      lorebook.name,
    key,
    updatedAt: Date.now(),
    // Carried onto the entry as well as the book, because the index is written
    // as a whole and `saveLorebookIndex` filters on this to keep the tour's
    // sample books out of storage.
    ...(lorebook.ephemeral ? { ephemeral: true } : {}),
    // Host mode: the CharSnap id this draft belongs to, so an mkp:load can find
    // its local copy from the index alone. Absent on every standalone book.
    ...(lorebook.hostId != null ? { hostId: lorebook.hostId } : {}),
  };
  return [entry, ...index];
}

/** Pick the host-bound draft to drop when storage is full: the least recently
 *  touched one that `isEvictable(id)` accepts (the caller decides what "clean"
 *  means — it has the books, this only has the index). Null if none qualifies.
 *  Standalone books are never candidates: they have no host copy to fall back on. */
export function evictOldestHostDraft(index, isEvictable) {
  const candidates = (index ?? []).filter((item) =>
    item.hostId != null && !item.ephemeral && isEvictable(item.id)
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0));
  return candidates[0].id;
}

/** Remove a lorebook entry from the index by id. */
export function removeFromIndex(index, id) {
  return index.filter((item) => item.id !== id);
}

/** Promote an existing entry to the top and refresh its timestamp. */
export function promoteInIndex(index, id) {
  const entry = index.find((item) => item.id === id);
  if (!entry) return index;
  const rest = index.filter((item) => item.id !== id);
  return [{ ...entry, updatedAt: Date.now() }, ...rest];
}

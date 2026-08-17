// Multi-lorebook index management: add, remove, promote recent, timestamp, key allocation (max 10)
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
  };
  return [entry, ...index];
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

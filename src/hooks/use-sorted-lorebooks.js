// The lorebook list, ordered — and, crucially, ordered only when the list opens.
//
// Recency is the right default: you are far more likely to want the book you
// were just working in than the one starting with "A". The stored index already
// tracks that (`promoteInIndex` moves the active book to the front on every
// switch), so recency costs nothing to produce.
//
// The catch is that switching a book *changes* that order. In the title menu
// nobody sees it, because the menu closes on switch. In the pull tab's side
// panel, which stays open, the list would visibly rearrange under the pointer
// the instant you clicked a row. So the order is snapshotted when the list opens
// and held until it opens again: accurate every time you go looking, never
// moving while you're looking at it.
//
// The snapshot is ids only. Names, timestamps and the active marker are read
// live from the store, so a rename or an autosave still shows through — it is
// the *sequence* that is frozen, not the contents.
import { useState, useEffect } from 'react';
import { useLorebookSwitcher } from './use-lorebook-switcher.js';
import { LOREBOOK_SORT } from '../constants/sort-modes.js';

function orderedIds(items, mode) {
  if (mode === LOREBOOK_SORT.alpha) {
    return [...items]
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
      .map((i) => i.id);
  }
  // The stored index is already newest-first; don't re-sort it.
  return items.map((i) => i.id);
}

export function useSortedLorebooks({ mode, open }) {
  const switcher = useLorebookSwitcher();
  const { items } = switcher;

  const [order, setOrder] = useState(() => orderedIds(items, mode));

  // Re-snapshot when the list opens, and immediately when the mode changes —
  // flipping to Alphabetical while looking at the list has to do something.
  useEffect(() => {
    if (!open) return;
    setOrder(orderedIds(items, mode));
    // `items` is deliberately not a dependency: reacting to it would re-sort on
    // every switch, which is the exact rearranging this exists to prevent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  // Resolve ids back to live rows. Anything created since the snapshot has no
  // place in it, so it goes on the end rather than vanishing; anything deleted
  // drops out.
  const known = new Set(order);
  const sorted = [
    ...order.map((id) => items.find((i) => i.id === id)).filter(Boolean),
    ...items.filter((i) => !known.has(i.id)),
  ];

  return { ...switcher, sorted };
}

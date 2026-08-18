// Display-only sort hook — never mutates the source array.
// The cross-match modes partition entries by whether their (trimmed,
// lowercase) name also exists in the paired reference book — order within
// each partition is preserved. The matched-name set is computed from both
// lorebooks so the same hook produces the right groupings whether it's
// sorting the active or the reference side.
import { useUiStore }       from '../state/ui-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';

export function useSort(entries) {
  const sortMode            = useUiStore((s) => s.sortMode);
  const activeLorebookId    = useLorebookStore((s) => s.activeLorebookId);
  const referenceLorebookId = useLorebookStore((s) => s.referenceLorebookId);
  const lorebooks           = useLorebookStore((s) => s.lorebooks);

  if (sortMode === 'default') return entries;

  const sorted = [...entries];
  if (sortMode === 'alpha-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } else if (sortMode === 'alpha-desc') {
    sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
  } else if (sortMode === 'last-modified') {
    sorted.sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));
  } else if (sortMode === 'cross-match-first' || sortMode === 'cross-match-last') {
    // Without a paired reference book the partition is empty — leave order alone.
    if (!activeLorebookId || !referenceLorebookId) return entries;
    const activeBook = lorebooks[activeLorebookId];
    const refBook    = lorebooks[referenceLorebookId];
    if (!activeBook || !refBook) return entries;

    const activeNames = new Set();
    for (const e of activeBook.entries) {
      const k = (e.name ?? '').trim().toLowerCase();
      if (k) activeNames.add(k);
    }
    const matched = new Set();
    for (const e of refBook.entries) {
      const k = (e.name ?? '').trim().toLowerCase();
      if (k && activeNames.has(k)) matched.add(k);
    }

    const inMatch = (e) => matched.has((e.name ?? '').trim().toLowerCase());
    const matchedFirst = sortMode === 'cross-match-first';
    const yes = [];
    const no  = [];
    for (const e of sorted) (inMatch(e) ? yes : no).push(e);
    return matchedFirst ? [...yes, ...no] : [...no, ...yes];
  }
  return sorted;
}

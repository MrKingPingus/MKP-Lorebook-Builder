// Display-only sort hook — never mutates the source array
import { useUiStore } from '../state/ui-store.js';

export function useSort(entries) {
  const sortMode = useUiStore((s) => s.sortMode);

  if (sortMode === 'default') return entries;

  const sorted = [...entries];
  if (sortMode === 'alpha-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  } else if (sortMode === 'alpha-desc') {
    sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
  } else if (sortMode === 'last-modified') {
    sorted.sort((a, b) => (b.lastModified ?? 0) - (a.lastModified ?? 0));
  }
  return sorted;
}

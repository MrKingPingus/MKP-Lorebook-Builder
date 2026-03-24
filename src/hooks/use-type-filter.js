// Active type filter toggle state and filtered entry list derivation by selected types
import { useUiStore } from '../state/ui-store.js';

export function useTypeFilter(entries) {
  const typeFilter       = useUiStore((s) => s.typeFilter);
  const toggleTypeFilter = useUiStore((s) => s.toggleTypeFilter);
  const setTypeFilter    = useUiStore((s) => s.setTypeFilter);

  const filteredEntries = typeFilter.length === 0
    ? entries
    : entries.filter((e) => typeFilter.includes(e.type));

  function clearFilter() {
    setTypeFilter([]);
  }

  return { typeFilter, toggleTypeFilter, clearFilter, filteredEntries };
}

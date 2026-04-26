// Shared search → type-filter → sort → group-by-type pipeline, driven entirely
// by ui-store state. Takes any entries array (active or reference lorebook) and
// returns the list to render plus the match metadata SearchBar needs. Called by
// GlobalFilterBar, BuildPanel, and ReferencePanel — they all derive from the
// same store, so computing in each place yields identical results.
import { useSearch }     from './use-search.js';
import { useTypeFilter } from './use-type-filter.js';
import { useSort }       from './use-sort.js';
import { useUi }         from './use-ui.js';
import { ENTRY_TYPES }   from '../constants/entry-types.js';

export function useDisplayEntries(entries) {
  const { filteredEntries: searchFiltered, matchCount, entryMatchCount, matchLocations } = useSearch(entries);
  const { filteredEntries } = useTypeFilter(searchFiltered);
  const sortedEntries       = useSort(filteredEntries);
  const groupByType         = useUi((s) => s.groupByType);
  const sortMode            = useUi((s) => s.sortMode);

  // last-modified sort overrides group-by-type (flat list, no grouping)
  const effectiveGroupByType = groupByType && sortMode !== 'last-modified';

  const displayEntries = effectiveGroupByType
    ? ENTRY_TYPES.flatMap((t) => sortedEntries.filter((e) => e.type === t.id))
    : sortedEntries;

  const displayMatchDetails = displayEntries
    .filter((e) => matchLocations.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, locations: matchLocations.get(e.id) }));

  return {
    displayEntries,
    displayMatchDetails,
    effectiveGroupByType,
    matchCount,
    entryMatchCount,
  };
}

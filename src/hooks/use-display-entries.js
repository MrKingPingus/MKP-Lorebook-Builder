// Shared search → type-filter → sort → group-by-type pipeline, driven entirely
// by ui-store state. Takes any entries array (active or reference lorebook) and
// returns the list to render plus the match metadata SearchBar needs. Called by
// GlobalFilterBar, BuildPanel, and ReferencePanel — they all derive from the
// same store, so computing in each place yields identical results.
import { useSearch }       from './use-search.js';
import { useTypeFilter }   from './use-type-filter.js';
import { useFolderFilter } from './use-folder-filter.js';
import { useSort }         from './use-sort.js';
import { useUi }           from './use-ui.js';
import { ENTRY_TYPES }     from '../constants/entry-types.js';
import { SORT_MODES_WITHOUT_GROUPING, suppressesFolders } from '../constants/sort-modes.js';

// `isReference` marks a call that is deriving the *reference* book's list. The
// folder filter is skipped there: its ids name folders in the active book, so
// applying them to the other book would blank the pane instead of narrowing it.
export function useDisplayEntries(entries, { isReference = false } = {}) {
  const { filteredEntries: searchFiltered, matchCount, entryMatchCount, matchLocations } = useSearch(entries);
  const { filteredEntries: typeFiltered } = useTypeFilter(searchFiltered);
  const { filterEntries }   = useFolderFilter();
  const filteredEntries     = isReference ? typeFiltered : filterEntries(typeFiltered);
  const sortedEntries       = useSort(filteredEntries);
  const groupByType         = useUi((s) => s.groupByType);
  const sortMode            = useUi((s) => s.sortMode);

  // last-modified and cross-match sorts override group-by-type (flat list,
  // no grouping — group-by-type would re-bucket and destroy the cross-match
  // partition or the recency order).
  const effectiveGroupByType = groupByType && !SORT_MODES_WITHOUT_GROUPING.includes(sortMode);

  // Folders are the same kind of grouping layer, so the cross-match partition
  // suppresses them too — otherwise filing an entry would quietly pull it out
  // of the matched/unmatched band the sort just put it in.
  const effectiveFolders = !suppressesFolders(sortMode);

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
    effectiveFolders,
    matchCount,
    entryMatchCount,
  };
}

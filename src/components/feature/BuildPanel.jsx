// Build tab content — composes SearchBar, TypeFilterBar, controls row, and EntryList
import { useEntries }    from '../../hooks/use-entries.js';
import { useSearch }     from '../../hooks/use-search.js';
import { useTypeFilter } from '../../hooks/use-type-filter.js';
import { useUi }         from '../../hooks/use-ui.js';
import { ENTRY_TYPES }   from '../../constants/entry-types.js';
import { SearchBar }     from './SearchBar.jsx';
import { TypeFilterBar } from './TypeFilterBar.jsx';
import { EntryList }     from './EntryList.jsx';

export function BuildPanel() {
  const { entries }                                      = useEntries();
  const { filteredEntries: searchFiltered, matchCount,
          entryMatchCount, searchQuery }                 = useSearch(entries);
  const { filteredEntries }                              = useTypeFilter(searchFiltered);
  const groupByType                                      = useUi((s) => s.groupByType);

  // When groupByType is active, reorder entries into type-grouped blocks
  const displayEntries = groupByType
    ? ENTRY_TYPES.flatMap((t) => filteredEntries.filter((e) => e.type === t.id))
    : filteredEntries;

  return (
    <div className="build-panel">
      <SearchBar
        entries={entries}
        matchCount={matchCount}
        entryMatchCount={entryMatchCount}
        firstMatchId={filteredEntries[0]?.id}
      />
      <TypeFilterBar entries={entries} />
      <EntryList entries={displayEntries} groupByType={groupByType} />
    </div>
  );
}

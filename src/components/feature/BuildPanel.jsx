// Build tab content — composes SearchBar, TypeFilterBar, controls row, and EntryList
import { useEntries }    from '../../hooks/use-entries.js';
import { useSearch }     from '../../hooks/use-search.js';
import { useTypeFilter } from '../../hooks/use-type-filter.js';
import { SearchBar }     from './SearchBar.jsx';
import { TypeFilterBar } from './TypeFilterBar.jsx';
import { EntryList }     from './EntryList.jsx';

export function BuildPanel() {
  const { entries }                                      = useEntries();
  const { filteredEntries: searchFiltered, matchCount,
          entryMatchCount, searchQuery }                 = useSearch(entries);
  const { filteredEntries }                              = useTypeFilter(searchFiltered);

  return (
    <div className="build-panel">
      <SearchBar
        entries={entries}
        matchCount={matchCount}
        entryMatchCount={entryMatchCount}
      />
      <TypeFilterBar entries={entries} />
      <EntryList entries={filteredEntries} />
    </div>
  );
}

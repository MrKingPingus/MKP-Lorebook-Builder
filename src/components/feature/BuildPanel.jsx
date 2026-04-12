// Build tab content — composes lorebook name (mobile), SearchBar, TypeFilterBar, and EntryList
import { useEntries }    from '../../hooks/use-entries.js';
import { useSearch }     from '../../hooks/use-search.js';
import { useTypeFilter } from '../../hooks/use-type-filter.js';
import { useSort }       from '../../hooks/use-sort.js';
import { useUi }         from '../../hooks/use-ui.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { useLorebook }   from '../../hooks/use-lorebook.js';
import { ENTRY_TYPES }   from '../../constants/entry-types.js';
import { SearchBar }     from './SearchBar.jsx';
import { TypeFilterBar } from './TypeFilterBar.jsx';
import { EntryList }     from './EntryList.jsx';

export function BuildPanel() {
  const { entries }                                      = useEntries();
  const { filteredEntries: searchFiltered, matchCount,
          entryMatchCount, searchQuery, matchLocations } = useSearch(entries);
  const { filteredEntries }                              = useTypeFilter(searchFiltered);
  const sortedEntries                                    = useSort(filteredEntries);
  const groupByType                                      = useUi((s) => s.groupByType);
  const sortMode                                         = useUi((s) => s.sortMode);
  const isMobile                                         = useMobile();
  const { activeLorebook, renameLorebook }               = useLorebook();

  // last-modified sort overrides group-by-type (flat list, no grouping)
  const effectiveGroupByType = groupByType && sortMode !== 'last-modified';

  // When groupByType is active, reorder entries into type-grouped blocks
  const displayEntries = effectiveGroupByType
    ? ENTRY_TYPES.flatMap((t) => sortedEntries.filter((e) => e.type === t.id))
    : sortedEntries;

  // Build ordered match details for the current display list (after type filter + sort + group)
  const displayMatchDetails = displayEntries
    .filter((e) => matchLocations.has(e.id))
    .map((e) => ({ id: e.id, name: e.name, locations: matchLocations.get(e.id) }));

  return (
    <div className="build-panel">
      {/* Lorebook name field — mobile only; desktop shows it in the window header */}
      {isMobile && (
        <div className="build-lorebook-name">
          <div className="field-label">LOREBOOK NAME</div>
          <input
            className="build-lorebook-name-input"
            value={activeLorebook?.name ?? ''}
            onChange={(e) => renameLorebook(e.target.value)}
            placeholder="Lorebook name…"
            spellCheck={false}
          />
        </div>
      )}
      <SearchBar
        entries={entries}
        matchCount={matchCount}
        entryMatchCount={entryMatchCount}
        matchDetails={displayMatchDetails}
        visibleIds={displayEntries.map((e) => e.id)}
      />
      <TypeFilterBar entries={entries} />
      <EntryList entries={displayEntries} groupByType={effectiveGroupByType} />
    </div>
  );
}

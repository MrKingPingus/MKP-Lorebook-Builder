// Build tab content — composes lorebook name (mobile), SearchBar, TypeFilterBar, and EntryList
import { useEntries }    from '../../hooks/use-entries.js';
import { useSearch }     from '../../hooks/use-search.js';
import { useTypeFilter } from '../../hooks/use-type-filter.js';
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
          entryMatchCount, searchQuery }                 = useSearch(entries);
  const { filteredEntries }                              = useTypeFilter(searchFiltered);
  const groupByType                                      = useUi((s) => s.groupByType);
  const isMobile                                         = useMobile();
  const { activeLorebook, renameLorebook }               = useLorebook();

  // When groupByType is active, reorder entries into type-grouped blocks
  const displayEntries = groupByType
    ? ENTRY_TYPES.flatMap((t) => filteredEntries.filter((e) => e.type === t.id))
    : filteredEntries;

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
        firstMatchId={filteredEntries[0]?.id}
      />
      <TypeFilterBar entries={entries} />
      <EntryList entries={displayEntries} groupByType={groupByType} />
    </div>
  );
}

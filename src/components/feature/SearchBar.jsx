// Search input with mode <select> dropdown (Search / Find & Replace) and MatchCounter
import { useSearch }    from '../../hooks/use-search.js';
import { MatchCounter } from '../ui/MatchCounter.jsx';
import { FindReplace }  from './FindReplace.jsx';

export function SearchBar({ entries, matchCount, entryMatchCount, firstMatchId }) {
  const { searchQuery, setSearchQuery, searchMode, setSearchMode } = useSearch(entries);

  function onModeChange(e) {
    setSearchMode(e.target.value);
    setSearchQuery('');
  }

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar">
        <input
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && firstMatchId) {
              document.getElementById(`entry-${firstMatchId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }}
          placeholder="Search entries..."
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')} title="Clear">×</button>
        )}
        <MatchCounter matchCount={matchCount} entryMatchCount={entryMatchCount} />
        <select
          className="search-mode-select"
          value={searchMode}
          onChange={onModeChange}
        >
          <option value="search">Search</option>
          <option value="find-replace">Find &amp; Replace</option>
        </select>
      </div>
      {searchMode === 'find-replace' && <FindReplace entries={entries} />}
    </div>
  );
}

// Search input with mode <select> dropdown (Search / Find & Replace), sort select, and MatchCounter
import { useSearch }    from '../../hooks/use-search.js';
import { useUi }        from '../../hooks/use-ui.js';
import { MatchCounter } from '../ui/MatchCounter.jsx';
import { FindReplace }  from './FindReplace.jsx';

export function SearchBar({ entries, matchCount, entryMatchCount, firstMatchId }) {
  const { searchQuery, setSearchQuery, searchMode, setSearchMode } = useSearch(entries);
  const sortMode    = useUi((s) => s.sortMode);
  const setSortMode = useUi((s) => s.setSortMode);

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
          <option value="find-replace">Find/Replace</option>
        </select>
        <select
          className={`search-sort-select${sortMode !== 'default' ? ' search-sort-select--active' : ''}`}
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          title="Sort entries"
        >
          <option value="default">Default</option>
          <option value="alpha-asc">A → Z</option>
          <option value="alpha-desc">Z → A</option>
          <option value="last-modified">Last Modified</option>
        </select>
      </div>
      {searchMode === 'find-replace' && <FindReplace entries={entries} />}
    </div>
  );
}

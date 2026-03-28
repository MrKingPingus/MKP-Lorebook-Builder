// Search input with mode <select> dropdown (Search / Find & Replace) and MatchCounter
import { useUiStore }   from '../../state/ui-store.js';
import { MatchCounter } from '../ui/MatchCounter.jsx';
import { FindReplace }  from './FindReplace.jsx';

export function SearchBar({ entries, matchCount, entryMatchCount, firstMatchId }) {
  const searchQuery    = useUiStore((s) => s.searchQuery);
  const searchMode     = useUiStore((s) => s.searchMode);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const setSearchMode  = useUiStore((s) => s.setSearchMode);

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

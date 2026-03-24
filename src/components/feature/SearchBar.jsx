// Search input with clear button, Search/Find-Replace mode toggle, and MatchCounter badge
import { useUiStore } from '../../state/ui-store.js';
import { MatchCounter } from '../ui/MatchCounter.jsx';
import { FindReplace } from './FindReplace.jsx';

export function SearchBar({ entries, matchCount, entryMatchCount }) {
  const searchQuery  = useUiStore((s) => s.searchQuery);
  const searchMode   = useUiStore((s) => s.searchMode);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const setSearchMode  = useUiStore((s) => s.setSearchMode);

  function toggleMode() {
    setSearchMode(searchMode === 'search' ? 'find-replace' : 'search');
    setSearchQuery('');
  }

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar">
        <input
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchMode === 'search' ? 'Search entries…' : 'Find…'}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')} title="Clear">×</button>
        )}
        <button className="search-mode-toggle" onClick={toggleMode} title="Toggle Find & Replace">
          {searchMode === 'search' ? '⇄' : '✕'}
        </button>
        <MatchCounter matchCount={matchCount} entryMatchCount={entryMatchCount} />
      </div>
      {searchMode === 'find-replace' && <FindReplace entries={entries} />}
    </div>
  );
}

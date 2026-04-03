// Search input with mode <select> dropdown (Search / Find & Replace), sort icon button, and MatchCounter
import { useState, useRef, useEffect } from 'react';
import { useSearch }    from '../../hooks/use-search.js';
import { useUi }        from '../../hooks/use-ui.js';
import { MatchCounter } from '../ui/MatchCounter.jsx';
import { FindReplace }  from './FindReplace.jsx';

const SORT_OPTIONS = [
  { value: 'default',       label: 'Default' },
  { value: 'alpha-asc',     label: 'A → Z' },
  { value: 'alpha-desc',    label: 'Z → A' },
  { value: 'last-modified', label: 'Last Modified' },
];

export function SearchBar({ entries, matchCount, entryMatchCount, firstMatchId }) {
  const { searchQuery, setSearchQuery, searchMode, setSearchMode } = useSearch(entries);
  const sortMode    = useUi((s) => s.sortMode);
  const setSortMode = useUi((s) => s.setSortMode);

  const [sortOpen, setSortOpen] = useState(false);
  const sortWrapRef = useRef(null);

  useEffect(() => {
    function onMouseDown(e) {
      if (!sortOpen) return;
      if (sortWrapRef.current && !sortWrapRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [sortOpen]);

  function onModeChange(e) {
    setSearchMode(e.target.value);
    setSearchQuery('');
  }

  function handleSortSelect(value) {
    setSortMode(value);
    setSortOpen(false);
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
        <div className="sort-btn-wrap" ref={sortWrapRef} onPointerDown={(e) => e.stopPropagation()}>
          <button
            className={`sort-btn${sortMode !== 'default' ? ' sort-btn--active' : ''}`}
            onClick={() => setSortOpen((v) => !v)}
            title="Sort entries"
          >
            ↕
          </button>
          {sortOpen && (
            <div className="sort-dropdown">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`sort-dropdown-item${sortMode === opt.value ? ' sort-dropdown-item--active' : ''}`}
                  onClick={() => handleSortSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {searchMode === 'find-replace' && <FindReplace entries={entries} />}
    </div>
  );
}

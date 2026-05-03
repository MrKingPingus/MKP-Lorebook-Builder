// Search input with mode select, sort button, match counter, Enter-key navigation, and results dropdown
import { useState, useRef, useEffect } from 'react';
import { useSearch }      from '../../hooks/use-search.js';
import { useUi }          from '../../hooks/use-ui.js';
import { useFindReplace } from '../../hooks/use-find-replace.js';
import { useSelection }   from '../../hooks/use-selection.js';
import { useMobile }      from '../../hooks/use-mobile.js';
import { MatchCounter }   from '../ui/MatchCounter.jsx';
import { FindReplace }    from './FindReplace.jsx';
import { BulkActionBar }  from './BulkActionBar.jsx';

const SORT_OPTIONS = [
  { value: 'default',       label: 'Default' },
  { value: 'alpha-asc',     label: 'A → Z' },
  { value: 'alpha-desc',    label: 'Z → A' },
  { value: 'last-modified', label: 'Last Modified' },
];

const LOCATION_LABELS = { name: 'title', trigger: 'trigger', description: 'desc' };

// matchDetails: [{id, name, locations}] — ordered list of matching entries in display order
// referenceMatchDetails: same shape, for reference-side hits; only shown on mobile in a separate dropdown section
// visibleIds: ordered list of entry ids currently visible after search + type filter + sort/group
// referenceVisibleIds: same, for the reference book in crosstalk; empty otherwise
// matches: [{role, matchCount, entryMatchCount}] — one entry in normal mode, active + reference in crosstalk
export function SearchBar({ entries, matches = [], matchDetails, referenceMatchDetails = [], visibleIds = [], referenceVisibleIds = [] }) {
  const { searchQuery, setSearchQuery, searchMode, setSearchMode } = useSearch(entries);
  const {
    findText, setFindText,
    replaceText, setReplaceText,
    matchCount: frMatchCount,
    matchesByLorebook,
    activeMatchCount, referenceMatchCount,
    replaceInActive, replaceInReference, replaceInBoth,
    scope, toggleScope, allSelected,
    scopeOpen, setScopeOpen,
  } = useFindReplace();
  const { selectedCount } = useSelection();
  const isMobile           = useMobile();
  const sortMode           = useUi((s) => s.sortMode);
  const setSortMode        = useUi((s) => s.setSortMode);
  const setSearchFocusedId = useUi((s) => s.setSearchFocusedId);
  const setPeekReferenceEntryId = useUi((s) => s.setPeekReferenceEntryId);

  const [sortOpen,      setSortOpen]      = useState(false);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [navIndex,      setNavIndex]      = useState(-1);

  const sortWrapRef    = useRef(null);
  const dropdownRef    = useRef(null);
  const searchInputRef = useRef(null);
  // Track query at last navigation press to reset index when query changes
  const lastNavQuery   = useRef('');

  // Close sort dropdown on outside click
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

  // Close results dropdown on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (!dropdownOpen) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [dropdownOpen]);

  // Reset nav index when the search query changes
  useEffect(() => {
    if (searchQuery !== lastNavQuery.current) {
      setNavIndex(-1);
      lastNavQuery.current = searchQuery;
    }
  }, [searchQuery]);

  function onModeChange(e) {
    const newMode = e.target.value;
    if (newMode === 'find-replace') {
      setFindText(searchQuery);
      setSearchQuery('');
    } else if (searchMode === 'find-replace') {
      setSearchQuery(findText);
    }
    setSearchMode(newMode);
  }

  function handleSortSelect(value) {
    setSortMode(value);
    setSortOpen(false);
  }

  function navigateToMatch(index) {
    if (!matchDetails || matchDetails.length === 0) return;
    const wrapped = ((index % matchDetails.length) + matchDetails.length) % matchDetails.length;
    setNavIndex(wrapped);
    lastNavQuery.current = searchQuery;
    const target = matchDetails[wrapped];
    setSearchFocusedId(target.id);
    document.getElementById(`entry-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setDropdownOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && searchQuery.trim() && matchDetails?.length > 0) {
      e.preventDefault();
      navigateToMatch(navIndex + 1);
    }
  }

  function onInputChange(e) {
    setSearchQuery(e.target.value);
    setDropdownOpen(!!e.target.value.trim());
  }

  function onResultClick(id) {
    setSearchFocusedId(id);
    document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setDropdownOpen(false);
  }

  function onReferenceResultClick(id) {
    setPeekReferenceEntryId(id);
    setDropdownOpen(false);
  }

  // Reference hits only surface in the dropdown on mobile — desktop has the
  // reference panel visible already.
  const showReferenceSection = isMobile && referenceMatchDetails && referenceMatchDetails.length > 0;

  function openDropdownIfResults() {
    if (searchQuery.trim() && (matchDetails?.length > 0 || showReferenceSection)) setDropdownOpen(true);
  }

  const showDropdown = dropdownOpen && searchQuery.trim() && (matchDetails?.length > 0 || showReferenceSection);
  const mobileFindReplace = isMobile && searchMode === 'find-replace';
  // On mobile in search/select modes the input + counter + mode select + sort
  // all fighting for one row squeezes the input to a thumbnail. Move counter
  // and mode-select to a second row so the input gets the full width.
  const mobileSearch      = isMobile && !mobileFindReplace;

  const sortBtn = (
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
  );

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar">
        {searchMode !== 'find-replace' && (
          <div className="search-input-wrap" ref={dropdownRef}>
            <input
              ref={searchInputRef}
              className="search-input"
              value={searchQuery}
              onChange={onInputChange}
              onFocus={openDropdownIfResults}
              onClick={openDropdownIfResults}
              onKeyDown={onKeyDown}
              placeholder="Search entries..."
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(''); setDropdownOpen(false); }} title="Clear">×</button>
            )}
            {showDropdown && (
              <div className="search-dropdown">
                {/* Mobile: counter inline at the top of the dropdown so the
                    bar's row 2 doesn't have to host it. Desktop still shows
                    the standalone counter beside the input. */}
                {isMobile && (
                  <div className="search-dropdown-counter">
                    <MatchCounter matches={matches} />
                  </div>
                )}
                {matchDetails?.length > 0 && showReferenceSection && (
                  <div className="search-dropdown-section-header">Active</div>
                )}
                {matchDetails?.map((m) => (
                  <button
                    key={m.id}
                    className="search-dropdown-item"
                    onMouseDown={(e) => { e.preventDefault(); onResultClick(m.id); }}
                  >
                    <span className="search-dropdown-name">{m.name || '(unnamed)'}</span>
                    <span className="search-dropdown-tags">
                      {m.locations.map((loc) => (
                        <span key={loc} className={`search-dropdown-tag search-dropdown-tag--${loc}`}>
                          {LOCATION_LABELS[loc]}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
                {showReferenceSection && (
                  <>
                    <div className="search-dropdown-section-header">Reference</div>
                    {referenceMatchDetails.map((m) => (
                      <button
                        key={`ref-${m.id}`}
                        className="search-dropdown-item search-dropdown-item--reference"
                        onMouseDown={(e) => { e.preventDefault(); onReferenceResultClick(m.id); }}
                      >
                        <span className="search-dropdown-name">{m.name || '(unnamed)'}</span>
                        <span className="search-dropdown-tags">
                          <span className="search-dropdown-tag search-dropdown-tag--ref">ref</span>
                          {m.locations.map((loc) => (
                            <span key={loc} className={`search-dropdown-tag search-dropdown-tag--${loc}`}>
                              {LOCATION_LABELS[loc]}
                            </span>
                          ))}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {searchMode === 'find-replace' && (
          <FindReplace
            findText={findText}
            setFindText={setFindText}
            replaceText={replaceText}
            setReplaceText={setReplaceText}
            matchCount={frMatchCount}
            matchesByLorebook={matchesByLorebook}
            activeMatchCount={activeMatchCount}
            referenceMatchCount={referenceMatchCount}
            replaceInActive={replaceInActive}
            replaceInReference={replaceInReference}
            replaceInBoth={replaceInBoth}
            scope={scope}
            toggleScope={toggleScope}
            allSelected={allSelected}
            scopeOpen={scopeOpen}
            setScopeOpen={setScopeOpen}
            row={mobileFindReplace ? 'inputs' : 'all'}
          />
        )}
        {!mobileFindReplace && !mobileSearch && searchMode === 'select' && (
          <span className="match-counter match-counter--select">{selectedCount} selected</span>
        )}
        {!mobileFindReplace && !mobileSearch && searchMode !== 'select' && (
          <MatchCounter matches={matches} />
        )}
        {!mobileFindReplace && !mobileSearch && (
          <select
            className="search-mode-select"
            value={searchMode}
            onChange={onModeChange}
          >
            <option value="search">Search</option>
            <option value="find-replace">Find/Replace</option>
            <option value="select">Select</option>
          </select>
        )}
        {sortBtn}
      </div>

      {/* Mobile search/select: second row with mode select. In select mode
          the selected-count stays inline since there's no dropdown to host
          it; in search mode the count moves into the dropdown header. */}
      {mobileSearch && (
        <div className="search-bar-row2">
          {searchMode === 'select' && (
            <span className="match-counter match-counter--select">{selectedCount} selected</span>
          )}
          <select
            className="search-mode-select"
            value={searchMode}
            onChange={onModeChange}
          >
            <option value="search">Search</option>
            <option value="find-replace">Find/Replace</option>
            <option value="select">Select</option>
          </select>
        </div>
      )}

      {/* Select mode: bulk action row */}
      {searchMode === 'select' && (
        <BulkActionBar visibleIds={visibleIds} referenceVisibleIds={referenceVisibleIds} />
      )}

      {/* Mobile find-replace: second row with Replace button and mode select */}
      {mobileFindReplace && (
        <div className="search-bar-row2">
          <FindReplace
            findText={findText}
            setFindText={setFindText}
            replaceText={replaceText}
            setReplaceText={setReplaceText}
            matchCount={frMatchCount}
            matchesByLorebook={matchesByLorebook}
            activeMatchCount={activeMatchCount}
            referenceMatchCount={referenceMatchCount}
            replaceInActive={replaceInActive}
            replaceInReference={replaceInReference}
            replaceInBoth={replaceInBoth}
            scope={scope}
            toggleScope={toggleScope}
            allSelected={allSelected}
            scopeOpen={scopeOpen}
            setScopeOpen={setScopeOpen}
            row="actions"
          />
          <select
            className="search-mode-select"
            value={searchMode}
            onChange={onModeChange}
          >
            <option value="search">Search</option>
            <option value="find-replace">Find/Replace</option>
            <option value="select">Select</option>
          </select>
        </div>
      )}
    </div>
  );
}

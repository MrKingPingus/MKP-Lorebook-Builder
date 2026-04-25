// Find and Replace fields — rendered inside SearchBar's single row; receives state as props
import { useRef, useEffect } from 'react';

const SCOPE_CHIPS = [
  { key: 'all',         label: 'All' },
  { key: 'title',       label: 'Title' },
  { key: 'triggers',    label: 'Triggers' },
  { key: 'description', label: 'Description' },
];

// row: 'all' (default) | 'inputs' (find+replace fields only) | 'actions' (replace button only)
export function FindReplace({
  findText, setFindText,
  replaceText, setReplaceText,
  matchCount, matchesByLorebook = [],
  activeMatchCount = 0, referenceMatchCount = 0,
  replaceInActive, replaceInReference,
  scope, toggleScope, allSelected,
  scopeOpen, setScopeOpen,
  row = 'all',
}) {
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    if (!scopeOpen) return;
    function onMouseDown(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setScopeOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [scopeOpen, setScopeOpen]);

  function isActive(key) {
    if (key === 'all') return allSelected;
    return scope[key];
  }

  const scopeEmpty = !scope.title && !scope.triggers && !scope.description;
  const crosstalk = matchesByLorebook.length > 1;

  const inputs = (
    <>
      <input
        className="find-input"
        value={findText}
        onChange={(e) => setFindText(e.target.value)}
        placeholder="Find…"
      />
      <input
        className="replace-input"
        value={replaceText}
        onChange={(e) => setReplaceText(e.target.value)}
        placeholder="Replace with…"
      />
    </>
  );

  const actions = (
    <div className="replace-btn-wrap" ref={popoverRef}>
      <button
        className="replace-all-btn"
        onClick={() => setScopeOpen((v) => !v)}
        disabled={!findText}
      >
        Replace ({matchCount})… ▾
      </button>

      {scopeOpen && (
        <div className="replace-scope-popover">
          {crosstalk && (
            <ul className="replace-scope-matches">
              {matchesByLorebook.map((m) => (
                <li key={m.id} className="replace-scope-matches-row">
                  <span className="replace-scope-matches-name">{m.name || '(unnamed)'}</span>
                  <span className="replace-scope-matches-count">{m.count}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="replace-scope-chips">
            {SCOPE_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                className={`replace-scope-chip${isActive(key) ? ' replace-scope-chip--active' : ''}`}
                onClick={() => toggleScope(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {crosstalk ? (
            <div className="replace-scope-apply-row">
              <button
                className="replace-scope-proceed"
                onClick={replaceInActive}
                disabled={activeMatchCount === 0 || scopeEmpty}
              >
                Apply to Active ({activeMatchCount})
              </button>
              <button
                className="replace-scope-proceed"
                onClick={replaceInReference}
                disabled={referenceMatchCount === 0 || scopeEmpty}
              >
                Apply to Reference ({referenceMatchCount})
              </button>
            </div>
          ) : (
            <button
              className="replace-scope-proceed"
              onClick={replaceInActive}
              disabled={matchCount === 0 || scopeEmpty}
            >
              Proceed
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (row === 'inputs')  return inputs;
  if (row === 'actions') return actions;
  return <>{inputs}{actions}</>;
}

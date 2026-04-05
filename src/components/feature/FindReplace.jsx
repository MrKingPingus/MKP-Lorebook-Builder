// Find and Replace fields — rendered inside SearchBar's single row; receives state as props
import { useRef, useEffect } from 'react';

export function FindReplace({
  findText, setFindText,
  replaceText, setReplaceText,
  matchCount, replaceAll,
  scope, toggleScope, allSelected,
  scopeOpen, setScopeOpen,
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

  return (
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
            <div className="replace-scope-options">
              <label className="replace-scope-option">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleScope('all')}
                />
                All
              </label>
              <label className="replace-scope-option">
                <input
                  type="checkbox"
                  checked={scope.title}
                  onChange={() => toggleScope('title')}
                />
                Title
              </label>
              <label className="replace-scope-option">
                <input
                  type="checkbox"
                  checked={scope.triggers}
                  onChange={() => toggleScope('triggers')}
                />
                Triggers
              </label>
              <label className="replace-scope-option">
                <input
                  type="checkbox"
                  checked={scope.description}
                  onChange={() => toggleScope('description')}
                />
                Description
              </label>
            </div>
            <button
              className="replace-scope-proceed"
              onClick={replaceAll}
              disabled={matchCount === 0 || (!scope.title && !scope.triggers && !scope.description)}
            >
              Proceed
            </button>
          </div>
        )}
      </div>
    </>
  );
}

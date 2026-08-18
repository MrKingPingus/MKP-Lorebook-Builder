// Find and Replace fields — rendered inside SearchBar's single row; receives state as props
import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAnchoredPosition } from '../../hooks/use-anchored-position.js';
import { POPOVER_EDGE_PAD_PX } from '../../constants/limits.js';

const SCOPE_CHIPS = [
  { key: 'all',         label: 'All' },
  { key: 'title',       label: 'Title' },
  { key: 'triggers',    label: 'Triggers' },
  { key: 'description', label: 'Description' },
];

const LOCATION_LABELS = { name: 'title', trigger: 'trigger', description: 'desc' };

// Widest the scope popover is allowed to be. Narrowed to whatever the viewport
// can actually hold, because a fixed 360 at a 360px phone width has nowhere to
// sit — see the width calculation below.
const SCOPE_POPOVER_WIDTH_PX = 360;

// row: 'all' (default) | 'inputs' (find+replace fields only) | 'actions' (replace button only)
export function FindReplace({
  findText, setFindText,
  replaceText, setReplaceText,
  matchCount, matchesByLorebook = [],
  activeMatchCount = 0, referenceMatchCount = 0,
  replaceInActive, replaceInReference, replaceInBoth,
  scope, toggleScope, allSelected,
  scopeOpen, setScopeOpen,
  row = 'all',
}) {
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const popoverRef = useRef(null);

  // The popover is portalled to the body, so it needs its anchor's rect. Captured
  // on open rather than measured per render — the button does not move while the
  // popover is up.
  const [anchorRect, setAnchorRect] = useState(null);
  const popoverStyle = useAnchoredPosition(
    scopeOpen ? anchorRect : null,
    Math.min(SCOPE_POPOVER_WIDTH_PX, window.innerWidth - POPOVER_EDGE_PAD_PX * 2),
  );

  // Measured off the button, not the wrapper: in the mobile row the wrapper is
  // squeezed narrower than the button it holds, so the wrapper's rect would
  // right-align the popover to an edge the user cannot see.
  function toggleScopeOpen() {
    setAnchorRect(btnRef.current?.getBoundingClientRect() ?? null);
    setScopeOpen((v) => !v);
  }

  // Close popover on outside click. Both nodes have to be tested now that the
  // popover no longer lives inside the wrapper: the wrapper so a click on the
  // trigger isn't treated as "outside" (which would close on mousedown and let
  // the click reopen), and the portalled popover so clicking inside it survives.
  useEffect(() => {
    if (!scopeOpen) return undefined;
    function onMouseDown(e) {
      // Only the instance that actually rendered the popover gets to judge what
      // is outside it. On mobile SearchBar renders FindReplace twice — the two
      // fields in one row, the Replace button in another — and both share
      // `scopeOpen`. The fields-only instance holds neither node, so if it
      // answered here every click would read as outside and the popover would
      // close before the button underneath it could act.
      if (!popoverRef.current) return;
      const inWrap = wrapRef.current?.contains(e.target);
      const inPopover = popoverRef.current.contains(e.target);
      if (!inWrap && !inPopover) setScopeOpen(false);
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
  const anyEntries = matchesByLorebook.some((m) => m.entries && m.entries.length > 0);

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
    <div className="replace-btn-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        className="replace-all-btn"
        onClick={toggleScopeOpen}
        disabled={!findText}
      >
        Replace ({matchCount})… ▾
      </button>

      {scopeOpen && popoverStyle && createPortal(
        <div className="replace-scope-popover" ref={popoverRef} style={popoverStyle}>
          {anyEntries && (
            <div className="replace-scope-matches">
              {matchesByLorebook.map((m) => (
                <section key={m.id} className="replace-scope-matches-book">
                  {crosstalk && (
                    <div className="replace-scope-matches-row">
                      <span className="replace-scope-matches-name">{m.name || '(unnamed)'}</span>
                      <span className="replace-scope-matches-count">{m.count}</span>
                    </div>
                  )}
                  {m.entries.length > 0 && (
                    <ul className="replace-scope-matches-entries">
                      {m.entries.map((e) => (
                        <li key={e.id} className="replace-scope-matches-entry">
                          <span className="replace-scope-matches-entry-name">{e.name || '(unnamed)'}</span>
                          <span className="replace-scope-matches-entry-tags">
                            {e.locations.map((loc) => (
                              <span key={loc} className={`search-dropdown-tag search-dropdown-tag--${loc}`}>
                                {LOCATION_LABELS[loc]}
                              </span>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
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
              <button
                className="replace-scope-proceed"
                onClick={replaceInBoth}
                disabled={matchCount === 0 || scopeEmpty}
              >
                Apply to Both ({matchCount})
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
        </div>,
        document.body,
      )}
    </div>
  );

  if (row === 'inputs')  return inputs;
  if (row === 'actions') return actions;
  return <>{inputs}{actions}</>;
}

// Lifted search + type-filter + sort bar. Lives above the pane split in
// FloatingWindow so both BuildPanel and (in crosstalk) ReferencePanel read
// from the same ui-store state. Match counter, results dropdown, and
// navigation are scoped to the active lorebook — the reference side is
// read-only and inherits only the filter/sort from ui-store.
import { useEntries }        from '../../hooks/use-entries.js';
import { useDisplayEntries } from '../../hooks/use-display-entries.js';
import { SearchBar }         from './SearchBar.jsx';
import { TypeFilterBar }     from './TypeFilterBar.jsx';

export function GlobalFilterBar() {
  const { entries } = useEntries();
  const { displayEntries, displayMatchDetails, matchCount, entryMatchCount } = useDisplayEntries(entries);

  return (
    <div className="global-filter-bar">
      <SearchBar
        entries={entries}
        matchCount={matchCount}
        entryMatchCount={entryMatchCount}
        matchDetails={displayMatchDetails}
        visibleIds={displayEntries.map((e) => e.id)}
      />
      <TypeFilterBar entries={entries} />
    </div>
  );
}

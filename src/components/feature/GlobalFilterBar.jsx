// Lifted search + type-filter + sort bar. Lives above the pane split in
// FloatingWindow so both BuildPanel and (in crosstalk) ReferencePanel read
// from the same ui-store state. Results dropdown and navigation are scoped
// to the active lorebook (reference is read-only); the match counter shows
// per-role counts so a two-pane search doesn't hide reference-side hits.
import { useEffect, useRef }    from 'react';
import { useEntries }           from '../../hooks/use-entries.js';
import { useSelection }         from '../../hooks/use-selection.js';
import { useUi }                from '../../hooks/use-ui.js';
import { useDisplayEntries }    from '../../hooks/use-display-entries.js';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { useMobile }            from '../../hooks/use-mobile.js';
import { SearchBar }            from './SearchBar.jsx';
import { TypeFilterBar }        from './TypeFilterBar.jsx';

export function GlobalFilterBar() {
  const { entries } = useEntries();
  const isMobile    = useMobile();
  const { referenceLorebook } = useReferenceLorebook();
  const active    = useDisplayEntries(entries);
  const reference = useDisplayEntries(referenceLorebook?.entries ?? [], { isReference: true });
  const { selectionSide, selectAllVisible } = useSelection();
  const selectAllNonce = useUi((s) => s.selectAllVisibleNonce);
  const lastNonce      = useRef(selectAllNonce);

  // The select-all-visible hotkey lands here because this is the only component
  // holding the visible-id list for *both* panes — same inputs BulkActionBar's
  // button uses, so the hotkey and the button can't drift apart.
  useEffect(() => {
    if (selectAllNonce === lastNonce.current) return;
    lastNonce.current = selectAllNonce;
    const side = selectionSide ?? 'active';
    const ids  = side === 'reference'
      ? reference.displayEntries.map((e) => e.id)
      : active.displayEntries.map((e) => e.id);
    selectAllVisible(ids, side);
  }, [selectAllNonce, selectionSide, active.displayEntries, reference.displayEntries, selectAllVisible]);

  const matches = [
    { role: 'Active', matchCount: active.matchCount, entryMatchCount: active.entryMatchCount },
  ];
  if (referenceLorebook) {
    matches.push({
      role: 'Reference',
      matchCount: reference.matchCount,
      entryMatchCount: reference.entryMatchCount,
    });
  }

  // GitHub #122, ask 1: on a phone the type filter moves up beside the mode
  // select instead of occupying a 39px band of its own for one 69px control.
  // It is passed *into* SearchBar rather than SearchBar importing it, so this
  // file stays the one place that decides what the filter bar is made of —
  // otherwise "which row is the filter button on" would be answered in two
  // components at once.
  const typeFilter = <TypeFilterBar entries={entries} />;

  return (
    <div className="global-filter-bar">
      <SearchBar
        entries={entries}
        matches={matches}
        matchDetails={active.displayMatchDetails}
        referenceMatchDetails={reference.displayMatchDetails}
        visibleIds={active.displayEntries.map((e) => e.id)}
        referenceVisibleIds={reference.displayEntries.map((e) => e.id)}
        filterControl={isMobile ? typeFilter : null}
      />
      {!isMobile && typeFilter}
    </div>
  );
}

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
import { SearchBar }            from './SearchBar.jsx';
import { TypeFilterBar }        from './TypeFilterBar.jsx';

export function GlobalFilterBar() {
  const { entries } = useEntries();
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

  return (
    <div className="global-filter-bar">
      <SearchBar
        entries={entries}
        matches={matches}
        matchDetails={active.displayMatchDetails}
        referenceMatchDetails={reference.displayMatchDetails}
        visibleIds={active.displayEntries.map((e) => e.id)}
        referenceVisibleIds={reference.displayEntries.map((e) => e.id)}
      />
      <TypeFilterBar entries={entries} />
    </div>
  );
}

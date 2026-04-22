// Build tab content — composes the mobile lorebook-name field and the EntryList.
// SearchBar, TypeFilterBar, and sort are hoisted to GlobalFilterBar above the
// pane split; this panel only renders the active lorebook's filtered entries.
import { useEntries }        from '../../hooks/use-entries.js';
import { useDisplayEntries } from '../../hooks/use-display-entries.js';
import { useMobile }         from '../../hooks/use-mobile.js';
import { useLorebook }       from '../../hooks/use-lorebook.js';
import { EntryList }         from './EntryList.jsx';

export function BuildPanel() {
  const { entries }                        = useEntries();
  const { displayEntries, effectiveGroupByType } = useDisplayEntries(entries);
  const isMobile                           = useMobile();
  const { activeLorebook, renameLorebook } = useLorebook();

  return (
    <div className="build-panel">
      {/* Lorebook name field — mobile only; desktop shows it in the window header */}
      {isMobile && (
        <div className="build-lorebook-name">
          <div className="field-label">LOREBOOK NAME</div>
          <input
            className="build-lorebook-name-input"
            value={activeLorebook?.name ?? ''}
            onChange={(e) => renameLorebook(e.target.value)}
            placeholder="Lorebook name…"
            spellCheck={false}
          />
        </div>
      )}
      <EntryList entries={displayEntries} groupByType={effectiveGroupByType} />
    </div>
  );
}

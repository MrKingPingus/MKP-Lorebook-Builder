// Build tab content. In crosstalk mode a pane header (ACTIVE label + picker)
// renders up top so the active side mirrors ReferencePanel's chrome; in solo
// mode the pane header is suppressed — switch+rename live in WindowHeader
// instead. SearchBar / TypeFilterBar / sort are hoisted to GlobalFilterBar.
import { useEntries }           from '../../hooks/use-entries.js';
import { useDisplayEntries }    from '../../hooks/use-display-entries.js';
import { useMobile }            from '../../hooks/use-mobile.js';
import { useLorebook }          from '../../hooks/use-lorebook.js';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { CROSSTALK_ENABLED }    from '../../constants/crosstalk.js';
import { EntryList }            from './EntryList.jsx';

export function BuildPanel() {
  const { entries }                              = useEntries();
  const { displayEntries, effectiveGroupByType } = useDisplayEntries(entries);
  const isMobile                                 = useMobile();
  const { activeLorebook, renameLorebook }       = useLorebook();
  const { items, switchLorebook }                = useLorebookSwitcher();
  const { referenceLorebook }                    = useReferenceLorebook();

  // Mirror ReferencePanel: picker options exclude the opposite side so a
  // lorebook can't occupy both slots at once.
  const pickerItems = items.filter((item) => item.id !== referenceLorebook?.id);

  function onPickerChange(e) {
    if (e.target.value) switchLorebook(e.target.value);
  }

  return (
    <div className="build-panel">
      {CROSSTALK_ENABLED && (
        <div className="pane-header">
          <div className="field-label pane-header-label">ACTIVE</div>
          <select
            className="pane-header-picker"
            value={activeLorebook?.id ?? ''}
            onChange={onPickerChange}
          >
            {!activeLorebook && <option value="">— Pick a lorebook —</option>}
            {pickerItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || '(unnamed)'}
              </option>
            ))}
          </select>
        </div>
      )}

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

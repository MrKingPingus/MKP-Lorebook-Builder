// Build tab content. In crosstalk mode a pane header (ACTIVE label + picker)
// renders up top so the active side mirrors ReferencePanel's chrome; in solo
// mode the pane header is suppressed — switch+rename live in WindowHeader
// instead. SearchBar / TypeFilterBar / sort are hoisted to GlobalFilterBar.
// On mobile, the LorebookRoleBar consolidates name + reference + role-swap
// into a single segmented bar (or a single solo row when crosstalk is off).
// During the Pick from Reference pose the role bar is hidden and a banner
// reminds the user they're in a transient mode and how to exit.
import { useEntries }           from '../../hooks/use-entries.js';
import { useDisplayEntries }    from '../../hooks/use-display-entries.js';
import { useMobile }            from '../../hooks/use-mobile.js';
import { useLorebook }          from '../../hooks/use-lorebook.js';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { usePickFromReference } from '../../hooks/use-pick-from-reference.js';
import { useSettings }          from '../../hooks/use-settings.js';
import { EntryList }            from './EntryList.jsx';
import { LorebookRoleBar }      from './LorebookRoleBar.jsx';

export function BuildPanel() {
  const { entries }                              = useEntries();
  const { displayEntries, effectiveGroupByType, effectiveFolders } = useDisplayEntries(entries);
  const isMobile                                 = useMobile();
  const { activeLorebook }                       = useLorebook();
  const { items, switchLorebook }                = useLorebookSwitcher();
  const { referenceLorebook, crosstalkEnabled, swapReference } = useReferenceLorebook();
  const { pickFromReferenceMode, exitPickFromReference } = usePickFromReference();
  const { crosstalkSwapMode }                    = useSettings();
  const fixedColumns = crosstalkSwapMode !== 'click-to-edit';

  // Mirror ReferencePanel: picker options exclude the opposite side so a
  // lorebook can't occupy both slots at once.
  const pickerItems = items.filter((item) => item.id !== referenceLorebook?.id);

  function onPickerChange(e) {
    if (e.target.value) switchLorebook(e.target.value);
  }

  return (
    <div className="build-panel">
      {crosstalkEnabled && !isMobile && (
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
          {fixedColumns && referenceLorebook && (
            <button
              className="pane-header-swap-btn"
              onClick={swapReference}
              title="Swap which book is active — columns stay put"
              type="button"
            >
              ⇄ Swap
            </button>
          )}
        </div>
      )}

      {isMobile && !pickFromReferenceMode && <LorebookRoleBar />}

      {isMobile && pickFromReferenceMode && (
        <div className="pick-from-reference-banner">
          <span className="pick-from-reference-banner-text">
            Picking from <strong>{activeLorebook?.name || '(unnamed)'}</strong>
          </span>
          <button
            className="pick-from-reference-banner-cancel"
            onClick={() => exitPickFromReference(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      <EntryList entries={displayEntries} groupByType={effectiveGroupByType} showFolders={effectiveFolders} />
    </div>
  );
}

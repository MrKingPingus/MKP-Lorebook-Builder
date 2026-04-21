// Read-only reference lorebook panel rendered alongside the active BuildPanel
// in crosstalk mode. Every edit-shaped surface (name, entry row, trigger chips)
// wraps a single onMouseDown that calls swapReference() and bails — the follow-
// up click then lands on the now-active side and edits the lorebook the user
// actually pointed at. The picker, scroll area, and (once wired) search/filter
// are exempt.
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useSettings }          from '../../hooks/use-settings.js';
import { TypeColorDot }         from '../ui/TypeColorDot.jsx';
import { StatsBadge }           from '../ui/StatsBadge.jsx';
import { ENTRY_TYPES }          from '../../constants/entry-types.js';

export function ReferencePanel() {
  const { referenceLorebook, setReferenceLorebookId, swapReference } = useReferenceLorebook();
  const { items }                                                   = useLorebookSwitcher();
  const { hideEntryStats, counterTiers, tieredCounterEnabled }      = useSettings();

  // Picker options: every saved lorebook except the currently active one.
  const pickerItems = items.filter((item) => !item.isActive);

  function onPickerChange(e) {
    setReferenceLorebookId(e.target.value || null);
  }

  // Single swap handler — swap before any click-driven edit UI can mount.
  // Applied to every edit-shaped surface; picker and scroll are exempt.
  function onSwap() {
    swapReference();
  }

  return (
    <div className="reference-panel">
      <div className="reference-panel-header">
        <div className="field-label">REFERENCE</div>
        <select
          className="reference-panel-picker"
          value={referenceLorebook?.id ?? ''}
          onChange={onPickerChange}
        >
          <option value="">— Pick a lorebook —</option>
          {pickerItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name || '(unnamed)'}
            </option>
          ))}
        </select>
      </div>

      {referenceLorebook && (
        <div
          className="reference-panel-name"
          onMouseDown={onSwap}
          title="Click to edit this lorebook (swaps with active)"
        >
          {referenceLorebook.name || '(unnamed)'}
        </div>
      )}

      <div className="reference-panel-body">
        {!referenceLorebook ? (
          <div className="reference-panel-empty">
            Pick a lorebook above to view it side-by-side.
          </div>
        ) : referenceLorebook.entries.length === 0 ? (
          <div className="reference-panel-empty">No entries.</div>
        ) : (
          <div className="reference-panel-entries" onMouseDown={onSwap}>
            {referenceLorebook.entries.map((entry, idx) => {
              const typeDef       = ENTRY_TYPES.find((t) => t.id === entry.type);
              const typeColor     = typeDef?.color ?? '#9ba1ad';
              const snapshotCount = entry.snapshots?.length ?? 0;
              return (
                <div
                  key={entry.id}
                  className="reference-entry-card"
                  style={{ '--type-color': typeColor }}
                >
                  <div className="reference-entry-header">
                    <TypeColorDot type={entry.type} />
                    <span className="reference-entry-label" style={{ color: typeColor }}>
                      #{idx + 1}: {entry.name || '(unnamed)'}
                    </span>
                    <div className="reference-entry-header-right">
                      {!hideEntryStats && (
                        <StatsBadge
                          triggerCount={entry.triggers.length}
                          charCount={entry.description.length}
                          counterTiers={counterTiers}
                          tieredEnabled={tieredCounterEnabled}
                        />
                      )}
                      {snapshotCount > 0 && (
                        <span
                          className="reference-entry-rollback"
                          title={`${snapshotCount} rollback snapshot${snapshotCount === 1 ? '' : 's'}`}
                        >
                          ↺ {snapshotCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {entry.triggers.length > 0 && (
                    <div className="reference-entry-triggers">
                      {entry.triggers.map((trigger, i) => (
                        <span key={i} className="reference-entry-trigger">
                          {trigger}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

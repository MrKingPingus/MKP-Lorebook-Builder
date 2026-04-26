// Read-only reference lorebook panel rendered alongside the active BuildPanel
// in crosstalk mode. Clicking anywhere on the entries area triggers
// swapReference — the follow-up click then lands on the now-active side and
// edits the lorebook the user actually pointed at. The header (label +
// picker) is exempt so the picker stays usable without triggering a swap.
// The Desc button + any expanded description body also opt out of swap so
// readers can peek and select-to-copy without committing to an edit pivot.
// In Select mode, the panel becomes a click-to-select source — swap is
// suppressed and clicking a card toggles its membership in the shared
// selection set (with side='reference').
import { useState }              from 'react';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useSettings }          from '../../hooks/use-settings.js';
import { useDisplayEntries }    from '../../hooks/use-display-entries.js';
import { useCrosstalk }         from '../../hooks/use-crosstalk.js';
import { useSelection }         from '../../hooks/use-selection.js';
import { TypeColorDot }         from '../ui/TypeColorDot.jsx';
import { StatsBadge }           from '../ui/StatsBadge.jsx';
import { ENTRY_TYPES }          from '../../constants/entry-types.js';

export function ReferencePanel() {
  const { referenceLorebook, setReferenceLorebookId, swapReference } = useReferenceLorebook();
  const { items }                                                   = useLorebookSwitcher();
  const { hideEntryStats, counterTiers, tieredCounterEnabled }      = useSettings();
  const { conflictMap, allowedOverlaps }                            = useCrosstalk();
  const { isSelectMode, selectedIds, toggleSelected }               = useSelection();

  // Ephemeral expand state — resets on swap (panel unmounts) and on lorebook
  // switch. A Set of entry ids whose description is currently revealed.
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  // Apply the same search/filter/sort/group pipeline the active side uses, so
  // the hoisted GlobalFilterBar drives both panels in parallel.
  const referenceEntries = referenceLorebook?.entries ?? [];
  const { displayEntries } = useDisplayEntries(referenceEntries);

  // Picker options: every saved lorebook except the currently active one.
  const pickerItems = items.filter((item) => !item.isActive);

  function onPickerChange(e) {
    setReferenceLorebookId(e.target.value || null);
  }

  // Single swap handler — swap before any click-driven edit UI can mount.
  function onSwap() {
    swapReference();
  }

  function toggleExpanded(id, e) {
    // Stop the swap-on-mousedown handler on the entries container from firing.
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  // Mousedown blocker for elements inside a card that should NOT trigger swap
  // (the Desc button itself, and any expanded description body).
  function stopSwap(e) {
    e.stopPropagation();
  }

  return (
    <div className="reference-panel">
      <div className="pane-header">
        <div className="field-label pane-header-label">REFERENCE</div>
        <select
          className="pane-header-picker"
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

      <div className="reference-panel-body">
        {!referenceLorebook ? (
          <div className="reference-panel-empty">
            Pick a lorebook above to view it side-by-side.
          </div>
        ) : referenceEntries.length === 0 ? (
          <div className="reference-panel-empty">No entries.</div>
        ) : displayEntries.length === 0 ? (
          <div className="reference-panel-empty">No entries match the current filter.</div>
        ) : (
          <div
            className="reference-panel-entries"
            onMouseDown={isSelectMode ? undefined : onSwap}
          >
            {displayEntries.map((entry, idx) => {
              const typeDef       = ENTRY_TYPES.find((t) => t.id === entry.type);
              const typeColor     = typeDef?.color ?? '#9ba1ad';
              const snapshotCount = entry.snapshots?.length ?? 0;
              const isExpanded    = expandedIds.has(entry.id);
              const hasDescription = (entry.description ?? '').length > 0;
              const isSelected    = selectedIds.has(entry.id);
              const cardClassName = `reference-entry-card${
                isSelectMode ? ' reference-entry-card--selectable' : ''
              }${isSelected ? ' reference-entry-card--selected' : ''}`;
              return (
                <div
                  key={entry.id}
                  className={cardClassName}
                  style={{ '--type-color': typeColor }}
                  onClick={isSelectMode ? () => toggleSelected(entry.id, 'reference') : undefined}
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
                      {hasDescription && (
                        <button
                          className="card-action-btn"
                          onMouseDown={stopSwap}
                          onClick={(e) => toggleExpanded(entry.id, e)}
                        >
                          {isExpanded ? '▲ Desc' : '▼ Desc'}
                        </button>
                      )}
                    </div>
                  </div>
                  {entry.triggers.length > 0 && (
                    <div className="reference-entry-triggers">
                      {entry.triggers.map((trigger, i) => {
                        const key            = trigger.toLowerCase();
                        const isConflict     = conflictMap.has(key);
                        const isAcknowledged = allowedOverlaps.includes(key);
                        const ringStyle = isConflict
                          ? { boxShadow: `0 0 0 2px ${isAcknowledged ? 'var(--blue)' : 'var(--yellow)'}` }
                          : undefined;
                        return (
                          <span key={i} className="reference-entry-trigger" style={ringStyle}>
                            {trigger}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {isExpanded && hasDescription && (
                    <div className="reference-entry-description" onMouseDown={stopSwap}>
                      {entry.description}
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

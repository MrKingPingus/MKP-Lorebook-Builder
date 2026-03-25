// Full interactive entry card — collapsed/expanded with left type-color border
import { useState } from 'react';
import { TypeColorDot }    from '../ui/TypeColorDot.jsx';
import { StatsBadge }      from '../ui/StatsBadge.jsx';
import { TypeSelector }    from './TypeSelector.jsx';
import { TriggerChips }    from './TriggerChips.jsx';
import { TriggerCompact }  from './TriggerCompact.jsx';
import { DescriptionArea } from './DescriptionArea.jsx';
import { SuggestionsTray } from './SuggestionsTray.jsx';
import { useSettings }     from '../../hooks/use-settings.js';
import { useUiStore }      from '../../state/ui-store.js';
import { ENTRY_TYPES }     from '../../constants/entry-types.js';

export function EntryCard({ entry, index, onUpdate, onRemove }) {
  const [localCollapsed, setLocalCollapsed] = useState(true);
  const { compactTriggerMode } = useSettings();
  const expandAll   = useUiStore((s) => s.expandAll);
  const collapseAll = useUiStore((s) => s.collapseAll);
  const [delimiter, setDelimiter] = useState(',');

  // expandAll/collapseAll override local collapsed state
  const collapsed = expandAll ? false : (collapseAll ? true : localCollapsed);

  const typeDef  = ENTRY_TYPES.find((t) => t.id === entry.type);
  const typeColor = typeDef?.color ?? '#9ba1ad';

  function update(patch) {
    onUpdate(entry.id, patch);
  }

  function addTrigger(word) {
    if (!entry.triggers.includes(word)) {
      update({ triggers: [...entry.triggers, word] });
    }
  }

  return (
    <div
      className="entry-card"
      style={{ '--type-color': typeColor }}
    >
      {/* ── Card header ── */}
      <div className="entry-card-header">
        <span className="drag-handle" title="Drag to reorder">⠿</span>
        <TypeColorDot type={entry.type} />
        <span className="entry-label" style={{ color: typeColor }}>
          #{index}: {entry.name || '(unnamed)'}
        </span>
        <div className="entry-card-header-right">
          <StatsBadge
            triggerCount={entry.triggers.length}
            charCount={entry.description.length}
          />
          <button
            className="card-action-btn"
            onClick={() => setLocalCollapsed((c) => !c)}
          >
            {collapsed ? '▼ Expand' : '▲ Collapse'}
          </button>
          <button
            className="card-action-btn card-action-btn--remove"
            onClick={() => onRemove(entry.id)}
          >
            Remove
          </button>
        </div>
      </div>

      {/* ── Card body (expanded) ── */}
      {!collapsed && (
        <div className="entry-card-body">
          {/* Row 1: Entry Name + Entry Type */}
          <div className="entry-fields-row">
            <div className="entry-field entry-field--name">
              <div className="field-label">ENTRY NAME</div>
              <input
                className="entry-name-field"
                value={entry.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Entry name…"
                spellCheck={false}
              />
            </div>
            <div className="entry-field entry-field--type">
              <div className="field-label">ENTRY TYPE</div>
              <TypeSelector
                value={entry.type}
                onChange={(type) => update({ type })}
              />
            </div>
          </div>

          {/* Row 2: Trigger Keywords header + delimiter select */}
          <div className="trigger-section">
            <div className="trigger-section-header">
              <div className="field-label">TRIGGER KEYWORDS</div>
              <select
                className="delimiter-select"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                title="Delimiter for bulk paste"
              >
                <option value=",">, comma</option>
                <option value=";">; semicolon</option>
              </select>
            </div>

            {compactTriggerMode ? (
              <TriggerCompact
                triggers={entry.triggers}
                onUpdate={(triggers) => update({ triggers })}
              />
            ) : (
              <TriggerChips
                triggers={entry.triggers}
                type={entry.type}
                delimiter={delimiter}
                onUpdate={(triggers) => update({ triggers })}
              />
            )}
          </div>

          {/* Row 3: Suggestions tray */}
          <SuggestionsTray entry={entry} onAddTrigger={addTrigger} />

          {/* Row 4: Description */}
          <DescriptionArea
            value={entry.description}
            onChange={(description) => update({ description })}
          />
        </div>
      )}
    </div>
  );
}

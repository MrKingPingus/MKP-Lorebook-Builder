// Full interactive entry card — name, type selector, triggers, description, suggestions tray
import { useState } from 'react';
import { TypeColorDot }    from '../ui/TypeColorDot.jsx';
import { StatsBadge }      from '../ui/StatsBadge.jsx';
import { EntryName }       from './EntryName.jsx';
import { TypeSelector }    from './TypeSelector.jsx';
import { TriggerChips }    from './TriggerChips.jsx';
import { TriggerCompact }  from './TriggerCompact.jsx';
import { DescriptionArea } from './DescriptionArea.jsx';
import { SuggestionsTray } from './SuggestionsTray.jsx';
import { useSettings }     from '../../hooks/use-settings.js';

export function EntryCard({ entry, index, onUpdate, onRemove }) {
  const [collapsed, setCollapsed] = useState(false);
  const { compactTriggerMode } = useSettings();

  function update(patch) {
    onUpdate(entry.id, patch);
  }

  function addTrigger(word) {
    update({ triggers: [...entry.triggers, word] });
  }

  return (
    <div className="entry-card">
      {/* Card header */}
      <div className="entry-card-header">
        <TypeColorDot type={entry.type} />
        <span className="entry-index">#{index + 1}</span>
        <EntryName value={entry.name} onChange={(name) => update({ name })} />
        <StatsBadge
          triggerCount={entry.triggers.length}
          charCount={entry.description.length}
        />
        <div className="card-header-actions">
          <button
            className="icon-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▼' : '▲'}
          </button>
          <button
            className="icon-btn icon-btn--danger"
            onClick={() => onRemove(entry.id)}
            title="Delete entry"
          >
            ×
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="entry-card-body">
          <div className="entry-row">
            <TypeSelector
              value={entry.type}
              onChange={(type) => update({ type })}
            />
          </div>

          <div className="entry-row">
            {compactTriggerMode ? (
              <TriggerCompact
                triggers={entry.triggers}
                onUpdate={(triggers) => update({ triggers })}
              />
            ) : (
              <TriggerChips
                triggers={entry.triggers}
                type={entry.type}
                onUpdate={(triggers) => update({ triggers })}
              />
            )}
          </div>

          <DescriptionArea
            value={entry.description}
            onChange={(description) => update({ description })}
            entryId={entry.id}
          />

          <SuggestionsTray entry={entry} onAddTrigger={addTrigger} />
        </div>
      )}
    </div>
  );
}

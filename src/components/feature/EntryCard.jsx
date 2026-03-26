// Full interactive entry card — collapsed/expanded with left type-color border
import { useState } from 'react';
import { TypeColorDot }    from '../ui/TypeColorDot.jsx';
import { StatsBadge }      from '../ui/StatsBadge.jsx';
import { TypeSelector }    from './TypeSelector.jsx';
import { TriggerChips }    from './TriggerChips.jsx';
import { DescriptionArea } from './DescriptionArea.jsx';
import { SuggestionsTray } from './SuggestionsTray.jsx';
import { useSettings }     from '../../hooks/use-settings.js';
import { useUiStore }      from '../../state/ui-store.js';
import { ENTRY_TYPES }     from '../../constants/entry-types.js';
import { escapeHtml, escapeRegex } from '../../services/html-escape.js';

export function EntryCard({ entry, index, onUpdate, onRemove, onDragHandleMouseDown }) {
  const [localCollapsed, setLocalCollapsed] = useState(true);
  const { hideEntryStats } = useSettings();
  const expandAll    = useUiStore((s) => s.expandAll);
  const collapseAll  = useUiStore((s) => s.collapseAll);
  const searchQuery  = useUiStore((s) => s.searchQuery);
  const setExpandAll   = useUiStore((s) => s.setExpandAll);
  const setCollapseAll = useUiStore((s) => s.setCollapseAll);
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

  // Build highlighted entry name HTML for the collapsed header
  function highlightedName() {
    const displayName = entry.name || '(unnamed)';
    if (!searchQuery) return null; // will use plain text
    const safe = escapeHtml(displayName);
    return safe.replace(
      new RegExp(`(${escapeRegex(escapeHtml(searchQuery))})`, 'gi'),
      '<mark class="search-mark">$1</mark>'
    );
  }

  const nameHtml = highlightedName();

  function onHeaderDoubleClick(e) {
    if (e.target.closest('button, .stats-badge')) return;
    setLocalCollapsed(!collapsed);
    setExpandAll(false);
    setCollapseAll(false);
  }

  return (
    <div
      id={`entry-${entry.id}`}
      className="entry-card"
      style={{ '--type-color': typeColor }}
    >
      {/* ── Card header ── */}
      <div className="entry-card-header" onDoubleClick={onHeaderDoubleClick}>
        <span className="drag-handle" title="Drag to reorder" onMouseDown={onDragHandleMouseDown}>⠿</span>
        <TypeColorDot type={entry.type} />
        {nameHtml ? (
          <span
            className="entry-label"
            style={{ color: typeColor }}
            dangerouslySetInnerHTML={{ __html: `#${index}: ${nameHtml}` }}
          />
        ) : (
          <span className="entry-label" style={{ color: typeColor }}>
            #{index}: {entry.name || '(unnamed)'}
          </span>
        )}
        <div className="entry-card-header-right">
          {!hideEntryStats && (
            <StatsBadge
              triggerCount={entry.triggers.length}
              charCount={entry.description.length}
            />
          )}
          <button
            className="card-action-btn"
            onClick={() => {
              setLocalCollapsed(!collapsed);
              setExpandAll(false);
              setCollapseAll(false);
            }}
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
        <div
          className="entry-card-body"
          onDoubleClick={(e) => {
            if (e.target.closest('button')) return;
            setLocalCollapsed(true);
            setExpandAll(false);
            setCollapseAll(false);
          }}
        >
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

            <TriggerChips
              triggers={entry.triggers}
              type={entry.type}
              delimiter={delimiter}
              searchQuery={searchQuery}
              onUpdate={(triggers) => update({ triggers })}
            />
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

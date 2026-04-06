// Full interactive entry card — mobile: slim tap-to-open row; desktop: collapsed/expanded with left type-color border
import { useState, useRef, useEffect } from 'react';
import { TypeColorDot }    from '../ui/TypeColorDot.jsx';
import { StatsBadge }      from '../ui/StatsBadge.jsx';
import { TypeSelector }    from './TypeSelector.jsx';
import { TriggerChips }    from './TriggerChips.jsx';
import { DescriptionArea } from './DescriptionArea.jsx';
import { SuggestionsTray } from './SuggestionsTray.jsx';
import { useSettings }    from '../../hooks/use-settings.js';
import { useMobile }      from '../../hooks/use-mobile.js';
import { useUi }          from '../../hooks/use-ui.js';
import { useEntryDetail } from '../../hooks/use-entry-detail.js';
import { useCrosstalk }   from '../../hooks/use-crosstalk.js';
import { ENTRY_TYPES }                              from '../../constants/entry-types.js';
import { MAX_TRIGGERS, TRIGGER_WARN_YELLOW,
         CHAR_LIMIT }                               from '../../constants/limits.js';
import { useHtmlEscape }                            from '../../hooks/use-html-escape.js';

export function EntryCard({ entry, index, onUpdate, onRemove, onDragHandleMouseDown }) {
  const [localCollapsed, setLocalCollapsed] = useState(true);
  const { hideEntryStats, counterTiers, tieredCounterEnabled, triggerDelimiter, setTriggerDelimiter } = useSettings();
  const { conflictMap, allowedOverlaps, allowOverlap, revokeOverlap } = useCrosstalk();
  const { escapeHtml, escapeRegex } = useHtmlEscape();
  const isMobile     = useMobile();
  const expandAll              = useUi((s) => s.expandAll);
  const collapseAll            = useUi((s) => s.collapseAll);
  const searchQuery            = useUi((s) => s.searchQuery);
  const searchFocusedId        = useUi((s) => s.searchFocusedId);
  const pendingFocusEntryId    = useUi((s) => s.pendingFocusEntryId);
  const setExpandAll           = useUi((s) => s.setExpandAll);
  const setCollapseAll         = useUi((s) => s.setCollapseAll);
  const setSearchFocusedId     = useUi((s) => s.setSearchFocusedId);
  const setPendingFocusEntryId = useUi((s) => s.setPendingFocusEntryId);
  const { openEntry }     = useEntryDetail();
  const nameInputRef = useRef(null);
  const shouldFocusName = useRef(false);

  // expandAll/collapseAll and search navigation override local collapsed state (desktop only)
  const isSearchFocused = searchFocusedId === entry.id;
  const collapsed = isSearchFocused ? false : (expandAll ? false : (collapseAll ? true : localCollapsed));

  // Desktop: auto-expand and focus name input when a new entry is created
  useEffect(() => {
    if (isMobile || pendingFocusEntryId !== entry.id) return;
    setPendingFocusEntryId(null);
    setExpandAll(false);
    setCollapseAll(false);
    if (!collapsed) {
      // Card already expanded — focus immediately, no need to wait for collapse change
      nameInputRef.current?.focus();
    } else {
      shouldFocusName.current = true;
      setLocalCollapsed(false);
    }
  }, [pendingFocusEntryId, entry.id, isMobile]);

  // Focus name input once the card body becomes visible after expand
  useEffect(() => {
    if (!collapsed && shouldFocusName.current) {
      shouldFocusName.current = false;
      nameInputRef.current?.focus();
    }
  }, [collapsed]);

  // Mobile: auto-open detail panel when a new entry is created
  useEffect(() => {
    if (!isMobile || pendingFocusEntryId !== entry.id) return;
    openEntry(entry.id);
    // Signal stays set — EntryDetailPanel clears it after focusing the name input
  }, [pendingFocusEntryId, entry.id, isMobile]);

  // Mobile: open detail panel when search navigation targets this entry
  useEffect(() => {
    if (!isMobile || !isSearchFocused) return;
    openEntry(entry.id);
  }, [isSearchFocused, isMobile]);

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
    if (!searchQuery) return null;
    const safe = escapeHtml(displayName);
    return safe.replace(
      new RegExp(`(${escapeRegex(escapeHtml(searchQuery))})`, 'gi'),
      '<mark class="search-mark">$1</mark>'
    );
  }

  const nameHtml = highlightedName();

  function toggleCollapse() {
    if (isSearchFocused) setSearchFocusedId(null);
    setLocalCollapsed(!collapsed);
    setExpandAll(false);
    setCollapseAll(false);
  }

  // Desktop: double-click header (skip if clicking a button or badge)
  function onHeaderDoubleClick(e) {
    if (e.target.closest('button, .stats-badge')) return;
    toggleCollapse();
  }

  // ── Mobile card — slim tap-to-open row ──────────────────────────────────────
  if (isMobile) {
    return (
      <div
        id={`entry-${entry.id}`}
        className="entry-card entry-card--mobile"
        style={{ '--type-color': typeColor }}
        onClick={() => openEntry(entry.id)}
      >
        <div className="entry-card-mobile-index">#{index}</div>
        <div className="entry-card-mobile-row">
          <span className="entry-card-mobile-name">
            {entry.name || '(unnamed)'}
          </span>
          <div className="entry-card-mobile-right">
            {!hideEntryStats && (
              <div className="entry-card-mobile-stats">
                <span style={{ color: entry.triggers.length >= MAX_TRIGGERS ? 'var(--red)' : entry.triggers.length >= TRIGGER_WARN_YELLOW ? 'var(--yellow)' : 'var(--green)' }}>
                  {entry.triggers.length}/{MAX_TRIGGERS} trg
                </span>
                <span style={{ color: tieredCounterEnabled ? (entry.description.length >= counterTiers?.red ? 'var(--red)' : entry.description.length >= counterTiers?.yellow ? 'var(--yellow)' : 'var(--green)') : 'var(--green)' }}>
                  {entry.description.length}/{CHAR_LIMIT} chr
                </span>
              </div>
            )}
            <span className="entry-card-mobile-chevron">›</span>
          </div>
        </div>
        <div className="entry-card-mobile-type">{typeDef?.label ?? entry.type}</div>
      </div>
    );
  }

  // ── Desktop card — expand/collapse in place (unchanged) ─────────────────────
  return (
    <div
      id={`entry-${entry.id}`}
      className="entry-card"
      style={{ '--type-color': typeColor }}
    >
      {/* ── Card header ── */}
      <div
        className="entry-card-header"
        onDoubleClick={onHeaderDoubleClick}
      >
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
              counterTiers={counterTiers}
              tieredEnabled={tieredCounterEnabled}
            />
          )}
          <button
            className="card-action-btn"
            title="double-click the entry to expand or collapse it!"
            onClick={toggleCollapse}
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
            if (isSearchFocused) setSearchFocusedId(null);
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
                ref={nameInputRef}
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
                value={triggerDelimiter}
                onChange={(e) => setTriggerDelimiter(e.target.value)}
                title="Delimiter for bulk paste and key commit"
              >
                <option value=",">, comma</option>
                <option value=";">; semicolon</option>
                <option value="-">- hyphen</option>
                <option value="~">~ tilde</option>
                <option value="/">/  forward slash</option>
                <option value="\">\  backslash</option>
              </select>
            </div>

            <TriggerChips
              triggers={entry.triggers}
              delimiter={triggerDelimiter}
              searchQuery={searchQuery}
              onUpdate={(triggers) => update({ triggers })}
              conflictMap={conflictMap}
              allowedOverlaps={allowedOverlaps}
              onAllowOverlap={allowOverlap}
              onRevokeOverlap={revokeOverlap}
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

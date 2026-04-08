// Full interactive entry card — mobile: slim tap-to-open row; desktop: collapsed/expanded with left type-color border
import { useState, useRef, useEffect } from 'react';
import { TypeColorDot }    from '../ui/TypeColorDot.jsx';
import { StatsBadge }      from '../ui/StatsBadge.jsx';
import { TypeSelector }    from './TypeSelector.jsx';
import { TriggerChips }    from './TriggerChips.jsx';
import { DescriptionArea } from './DescriptionArea.jsx';
import { SuggestionsTray } from './SuggestionsTray.jsx';
import { RollbackPanel }   from './RollbackPanel.jsx';
import { useSettings }    from '../../hooks/use-settings.js';
import { useMobile }      from '../../hooks/use-mobile.js';
import { useUi }          from '../../hooks/use-ui.js';
import { useEntryDetail } from '../../hooks/use-entry-detail.js';
import { useCrosstalk }   from '../../hooks/use-crosstalk.js';
import { useRollback }    from '../../hooks/use-rollback.js';
import { ENTRY_TYPES }                              from '../../constants/entry-types.js';
import { MAX_TRIGGERS, TRIGGER_WARN_YELLOW,
         CHAR_LIMIT }                               from '../../constants/limits.js';
import { useHtmlEscape }                            from '../../hooks/use-html-escape.js';

export function EntryCard({ entry, index, onUpdate, onRemove, onDragHandleMouseDown }) {
  const [localCollapsed, setLocalCollapsed]   = useState(true);
  const [rollbackOpen, setRollbackOpen]       = useState(false);
  const [suppressChecked, setSuppressChecked] = useState(false);
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
  const setActiveMenuPanel     = useUi((s) => s.setActiveMenuPanel);
  const { openEntry }     = useEntryDetail();
  const rollback        = useRollback({ entry, onUpdate });
  const nameInputRef    = useRef(null);
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

  function update(patch, discrete = false) {
    rollback.onBeforeEdit();
    onUpdate(entry.id, patch, discrete);
  }

  function addTrigger(word) {
    if (!entry.triggers.includes(word)) {
      update({ triggers: [...entry.triggers, word] }, true);
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

  function doCollapse() {
    if (isSearchFocused) setSearchFocusedId(null);
    setLocalCollapsed(true);
    setExpandAll(false);
    setCollapseAll(false);
    setRollbackOpen(false);
    setSuppressChecked(false);
  }

  function toggleCollapse() {
    if (collapsed) {
      if (isSearchFocused) setSearchFocusedId(null);
      setLocalCollapsed(false);
      setExpandAll(false);
      setCollapseAll(false);
    } else {
      rollback.handleCollapseIntent(doCollapse);
    }
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
            if (e.target.closest('button, input, textarea, select, .rollback-panel')) return;
            rollback.handleCollapseIntent(doCollapse);
          }}
        >
          {/* Navigate-away prompt — rendered first so it's visible at the top */}
          {rollback.promptVisible && (
            <div className="rollback-prompt">
              <div className="rollback-prompt-message">Save a snapshot before closing?</div>
              <div className="rollback-prompt-actions">
                <button className="rollback-prompt-btn" onClick={() => { rollback.promptSaveNew(suppressChecked); setSuppressChecked(false); }}>
                  Save New
                </button>
                <button className="rollback-prompt-btn" onClick={() => { rollback.promptReplace(suppressChecked); setSuppressChecked(false); }}>
                  Replace Latest
                </button>
                <button className="rollback-prompt-btn rollback-prompt-btn--skip" onClick={rollback.dismissPrompt}>
                  Skip
                </button>
              </div>
              <label className="rollback-prompt-suppress">
                <input
                  type="checkbox"
                  checked={suppressChecked}
                  onChange={(e) => setSuppressChecked(e.target.checked)}
                />
                Don't ask again this session
              </label>
            </div>
          )}

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
                onChange={(type) => update({ type }, true)}
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
              onUpdate={(triggers) => update({ triggers }, true)}
              conflictMap={conflictMap}
              allowedOverlaps={allowedOverlaps}
              onAllowOverlap={allowOverlap}
              onRevokeOverlap={revokeOverlap}
              ignoreLimitWarning={entry.ignoreLimitWarnings?.triggers ?? false}
              onToggleLimitWarning={() => update({
                ignoreLimitWarnings: {
                  ...entry.ignoreLimitWarnings,
                  triggers: !entry.ignoreLimitWarnings?.triggers,
                },
              })}
            />
          </div>

          {/* Row 3: Suggestions tray */}
          <SuggestionsTray entry={entry} onAddTrigger={addTrigger} />

          {/* Row 4: Description */}
          <DescriptionArea
            value={entry.description}
            onChange={(description) => update({ description })}
            ignoreLimitWarning={entry.ignoreLimitWarnings?.description ?? false}
            onToggleLimitWarning={() => update({
              ignoreLimitWarnings: {
                ...entry.ignoreLimitWarnings,
                description: !entry.ignoreLimitWarnings?.description,
              },
            })}
          />

          {/* Row 5: Rollback */}
          <div className="rollback-footer">
            <button
              className={`rollback-toggle-btn${rollback.enabled ? '' : ' rollback-toggle-btn--disabled'}`}
              onClick={() => {
                if (rollback.enabled) {
                  setRollbackOpen((o) => !o);
                } else {
                  setActiveMenuPanel('settings');
                }
              }}
              title={rollback.enabled ? 'View and restore snapshots' : 'Open Settings to enable rollback for this lorebook'}
            >
              ↺ Rollback{rollback.enabled && rollback.snapshots.length > 0 ? ` (${rollback.snapshots.length})` : ''}
            </button>
          </div>

          {rollbackOpen && rollback.enabled && (
            <RollbackPanel
              snapshots={rollback.snapshots}
              onRestore={rollback.restoreSnapshot}
              onUpdateLabel={rollback.updateSnapshotLabel}
              onTogglePin={rollback.toggleSnapshotPin}
              onDeleteSnapshot={rollback.deleteSnapshot}
              onSaveManual={rollback.saveSnapshot}
              promptSuppressed={rollback.promptSuppressed}
              onReEnablePrompt={rollback.reEnablePrompt}
            />
          )}
        </div>
      )}
    </div>
  );
}

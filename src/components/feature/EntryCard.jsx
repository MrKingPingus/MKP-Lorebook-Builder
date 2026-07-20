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
import { useNameMatch }   from '../../hooks/use-name-match.js';
import { useRollback }    from '../../hooks/use-rollback.js';
import { diffEntries, entriesShallowEqual } from '../../services/diff-service.js';
import { useIsSelectMode, useIsSelected, useToggleSelected,
         useStagedType, useSetStagedType }              from '../../hooks/use-selection.js';
import { ENTRY_TYPES }                              from '../../constants/entry-types.js';
import { MAX_TRIGGERS, TRIGGER_WARN_YELLOW,
         CHAR_LIMIT }                               from '../../constants/limits.js';
import { useHtmlEscape }                            from '../../hooks/use-html-escape.js';

// Header status badges. CharSnap entries default to private, so Public is the
// exception worth flagging — an open eye = "made Public". Hidden-from-Export
// gets an export/upload glyph crossed out, a distinct metaphor from the eye.
function PublicEyeIcon() {
  return (
    <span className="entry-public-icon" title="Public on CharSnap" aria-label="Public">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </span>
  );
}

function PrivateEyeOffIcon() {
  return (
    <span className="entry-private-icon" title="Private on CharSnap" aria-label="Private">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    </span>
  );
}

function ExportOffIcon() {
  return (
    <span className="entry-hidden-icon" title="Entry excluded from JSON export" aria-label="Hidden from export">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
        <line x1="3" y1="3" x2="21" y2="21"/>
      </svg>
    </span>
  );
}

export function EntryCard({ entry, index, onUpdate, onRemove, onDragHandleMouseDown }) {
  const [localCollapsed, setLocalCollapsed]   = useState(true);
  const [rollbackOpen, setRollbackOpen]       = useState(false);
  const [suppressChecked, setSuppressChecked] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen]       = useState(false);
  const { hideEntryStats, markPrivateEntries, counterTiers, tieredCounterEnabled, triggerDelimiter, setTriggerDelimiter } = useSettings();
  const { conflictMap, allowedOverlaps, allowOverlap, allowOverlaps, revokeOverlap } = useCrosstalk();
  const { activeToRef: nameMatchMap, matchedRefByActive } = useNameMatch();
  const setPeekReferenceEntryId = useUi((s) => s.setPeekReferenceEntryId);
  const pickFromReferenceMode   = useUi((s) => s.pickFromReferenceMode);
  const crossFlashId            = useUi((s) => s.crossFlashId);
  const setCrossFlashId         = useUi((s) => s.setCrossFlashId);
  const compareEntryId          = useUi((s) => s.compareEntryId);
  const setCompareEntryId       = useUi((s) => s.setCompareEntryId);
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

  // Selection mode — overrides normal card behaviour (always collapsed, click toggles selection)
  const isSelectMode   = useIsSelectMode();
  const isSelected     = useIsSelected(entry.id);
  const toggleSelected = useToggleSelected();
  const stagedType     = useStagedType(entry.id);
  const setStagedType  = useSetStagedType();
  const stagedDiffers  = stagedType !== null && stagedType !== entry.type;

  // expandAll/collapseAll and search navigation override local collapsed state (desktop only)
  // In select mode, cards are always collapsed and not expandable.
  const isSearchFocused = searchFocusedId === entry.id;
  const collapsed = isSelectMode
    ? true
    : (isSearchFocused ? false : (expandAll ? false : (collapseAll ? true : localCollapsed)));

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

  const sameNameRefId   = nameMatchMap.get(entry.id) ?? null;
  const matchedRefEntry = matchedRefByActive.get(entry.id) ?? null;
  const matchedIsEqual  = matchedRefEntry ? entriesShallowEqual(entry, matchedRefEntry) : false;
  const isCrossFlashing = crossFlashId === entry.id;
  const isComparing     = compareEntryId === entry.id && !!matchedRefEntry;

  // Per-field delta is only computed while comparing this entry. The LCS in
  // diffEntries is fast enough at typical entry sizes to recompute on every
  // keystroke without a debounce.
  const compareDelta = isComparing ? diffEntries(matchedRefEntry, entry) : null;

  // Badge click:
  //   - Green (identical) → jump straight to the counterpart
  //   - Yellow (differs)  → toggle side-by-side compare mode for this pair
  function onBadgeClick(e) {
    e.stopPropagation();
    if (!sameNameRefId) return;
    if (matchedIsEqual) {
      jumpToReference(sameNameRefId);
    } else {
      setCompareEntryId(isComparing ? null : entry.id);
    }
  }

  // When compare mode targets this entry, force-expand the card and scroll
  // it into view. Stop forcing once the user collapses it explicitly.
  useEffect(() => {
    if (isMobile || !isComparing) return;
    if (collapsed) {
      if (isSearchFocused) setSearchFocusedId(null);
      setLocalCollapsed(false);
      setExpandAll(false);
      setCollapseAll(false);
    }
    requestAnimationFrame(() => {
      document.getElementById(`entry-${entry.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [isComparing, isMobile]);

  // Per-field copy: pulls just the named field from the reference entry into
  // the active entry. discrete=true so each click lands as its own undo step.
  // If the resulting entry matches the reference exactly, auto-exit compare
  // mode — the user's gesture said "make this match", so the green "in both"
  // state shouldn't require a second click on the badge to commit.
  function copyField(fieldName) {
    if (!matchedRefEntry) return;
    const patch = fieldName === 'triggers'
      ? { triggers: [...matchedRefEntry.triggers] }
      : { [fieldName]: matchedRefEntry[fieldName] };
    const nextEntry = { ...entry, ...patch };
    update(patch, true);
    if (entriesShallowEqual(nextEntry, matchedRefEntry)) {
      setCompareEntryId(null);
    }
  }
  function copyAllFromReference() {
    if (!matchedRefEntry) return;
    update({
      name:        matchedRefEntry.name,
      type:        matchedRefEntry.type,
      description: matchedRefEntry.description,
      triggers:    [...matchedRefEntry.triggers],
    }, true);
    // Copy-All always results in a match, so always exit compare mode.
    setCompareEntryId(null);
  }

  // Cross-pane "in both books" jump — flash the matching reference card and
  // scroll it into view. Uses ui-store crossFlashId so the reference card can
  // pick up a transient highlight class without a shared parent.
  function jumpToReference(refId) {
    setCrossFlashId(refId);
    requestAnimationFrame(() => {
      document.getElementById(`ref-entry-${refId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    setTimeout(() => {
      // Only clear if it's still us — avoid stomping a later jump
      if (useUi.getState().crossFlashId === refId) setCrossFlashId(null);
    }, 1400);
  }

  function update(patch, discrete = false) {
    rollback.onBeforeEdit();
    onUpdate(entry.id, patch, discrete);
  }

  function addTrigger(word) {
    if (!entry.triggers.includes(word)) {
      update({ triggers: [...entry.triggers, word] }, true);
    }
  }

  // Batch-add path for the thesaurus popover. Looping addTrigger would read
  // stale entry.triggers per call and only persist the last word.
  function addTriggers(words) {
    const next = [...entry.triggers];
    for (const w of words) if (!next.includes(w)) next.push(w);
    if (next.length !== entry.triggers.length) update({ triggers: next }, true);
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
        className={`entry-card entry-card--mobile${isSelected ? ' entry-card--selected' : ''}${isCrossFlashing ? ' entry-card--cross-flash' : ''}`}
        style={{ '--type-color': typeColor }}
        onClick={() => isSelectMode ? toggleSelected(entry.id, 'active') : openEntry(entry.id)}
      >
        <div className="entry-card-mobile-index">#{index}</div>
        <div className="entry-card-mobile-row">
          <span className="entry-card-mobile-name">
            {entry.name || '(unnamed)'}
            {sameNameRefId && (
              pickFromReferenceMode ? (
                // During Pick from Reference pose, books are swapped — a name
                // match means this reference-side entry is also in the user's
                // original active book, i.e. copying it would duplicate.
                <span
                  className="entry-ref-badge entry-ref-badge--in-active"
                  title="Same-named entry already exists in your active book — copying would duplicate"
                >
                  in active
                </span>
              ) : (
                <button
                  className="entry-ref-badge"
                  onClick={(e) => { e.stopPropagation(); setPeekReferenceEntryId(sameNameRefId); }}
                  title="Same-named entry exists in the reference book — tap to peek"
                >
                  ref <span className="entry-ref-badge-arrow">↗</span>
                </button>
              )
            )}
          </span>
          <div className="entry-card-mobile-right">
            {entry.isPublic === true && <PublicEyeIcon />}
            {entry.isPublic !== true && markPrivateEntries && <PrivateEyeOffIcon />}
            {entry.hiddenFromExport && <ExportOffIcon />}
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
        {isSelectMode && isSelected ? (
          <select
            className={`entry-card-mobile-type entry-card-mobile-type--staged${stagedDiffers ? ' staged-type-select--pending' : ''}`}
            value={stagedType ?? entry.type}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value;
              setStagedType(entry.id, v === entry.type ? null : v);
            }}
            title="Stage a per-entry type change — apply all staged changes from the bulk action bar"
          >
            {ENTRY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        ) : (
          <div className="entry-card-mobile-type">{typeDef?.label ?? entry.type}</div>
        )}
      </div>
    );
  }

  // ── Desktop card — expand/collapse in place (click-to-select in select mode) ─
  return (
    <div
      id={`entry-${entry.id}`}
      className={`entry-card${isSelected ? ' entry-card--selected' : ''}${isSelectMode ? ' entry-card--selectable' : ''}${isCrossFlashing ? ' entry-card--cross-flash' : ''}`}
      style={{ '--type-color': typeColor }}
      onClick={isSelectMode ? () => toggleSelected(entry.id, 'active') : undefined}
    >
      {/* ── Card header ── */}
      <div
        className="entry-card-header"
        onDoubleClick={isSelectMode ? undefined : onHeaderDoubleClick}
      >
        {!isSelectMode && (
          <span className="drag-handle" title="Drag to reorder" onMouseDown={onDragHandleMouseDown}>⠿</span>
        )}

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
        {isSelectMode && isSelected && (
          <select
            className={`staged-type-select${stagedDiffers ? ' staged-type-select--pending' : ''}`}
            value={stagedType ?? entry.type}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const v = e.target.value;
              setStagedType(entry.id, v === entry.type ? null : v);
            }}
            title={stagedDiffers
              ? `Staged: change to ${ENTRY_TYPES.find((t) => t.id === stagedType)?.label ?? stagedType}. Apply via the bulk action bar.`
              : 'Stage a per-entry type change — apply all staged changes from the bulk action bar'}
          >
            {ENTRY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        )}
        {entry.isPublic === true && <PublicEyeIcon />}
        {entry.isPublic !== true && markPrivateEntries && <PrivateEyeOffIcon />}
        {entry.hiddenFromExport && <ExportOffIcon />}
        {sameNameRefId && (
          <button
            className={`entry-ref-badge entry-ref-badge--header${matchedIsEqual ? ' entry-ref-badge--match' : ' entry-ref-badge--diff'}${isComparing && !matchedIsEqual ? ' entry-ref-badge--comparing' : ''}`}
            onClick={onBadgeClick}
            title={
              matchedIsEqual
                ? 'Identical entry exists in the reference book — click to jump to it'
                : isComparing
                  ? 'Click to exit compare mode'
                  : 'Same-named entry differs in the reference book — click to compare side by side'
            }
            type="button"
          >
            {matchedIsEqual ? 'in both ↗' : (isComparing ? 'comparing ✎' : 'differs ⚖')}
          </button>
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
          {!isSelectMode && (
            <button
              className="card-action-btn"
              title="double-click the entry to expand or collapse it!"
              onClick={toggleCollapse}
            >
              {collapsed ? '▼ Expand' : '▲ Collapse'}
            </button>
          )}
          {!isSelectMode && (
            <button
              className="card-action-btn card-action-btn--remove"
              onClick={() => onRemove(entry.id)}
            >
              Remove
            </button>
          )}
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
                <button className="rollback-prompt-btn rollback-prompt-btn--skip" onClick={rollback.promptSkip}>
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
            <div className={`entry-field entry-field--name${isComparing && compareDelta?.name ? ' entry-field--differs' : ''}`}>
              <div className="field-label">
                ENTRY NAME
                {isComparing && compareDelta?.name && (
                  <span className="diff-modified-dot" title="Differs from reference">●</span>
                )}
              </div>
              <input
                ref={nameInputRef}
                className="entry-name-field"
                value={entry.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Entry name…"
                spellCheck={false}
              />
            </div>
            <div className={`entry-field entry-field--type${isComparing && compareDelta?.type ? ' entry-field--differs' : ''}`}>
              <div className="field-label">
                ENTRY TYPE
                {isComparing && compareDelta?.type && (
                  <span className="diff-modified-dot" title="Differs from reference">●</span>
                )}
              </div>
              <TypeSelector
                value={entry.type}
                onChange={(type) => update({ type }, true)}
              />
            </div>
          </div>

          {/* Row 2: Trigger Keywords header + delimiter select */}
          <div className={`trigger-section${isComparing && compareDelta?.changedFields.has('triggers') ? ' trigger-section--differs' : ''}`}>
            <div className="trigger-section-header">
              <div className="field-label">
                TRIGGER KEYWORDS
                {isComparing && compareDelta?.changedFields.has('triggers') && (
                  <span className="diff-modified-dot" title="Differs from reference">●</span>
                )}
              </div>
              {(() => {
                const entryConflicts    = entry.triggers.map((t) => t.toLowerCase()).filter((t) => conflictMap.has(t));
                const unacknowledged    = entryConflicts.filter((t) => !allowedOverlaps.includes(t));
                if (entryConflicts.length < 2 || unacknowledged.length === 0) return null;
                return (
                  <button
                    className="allow-all-overlap-btn"
                    onClick={() => allowOverlaps(unacknowledged)}
                    title="Mark all conflicting triggers in this entry as intentional overlaps"
                  >
                    Allow all overlap
                  </button>
                );
              })()}
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
              entryId={entry.id}
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

          {/* Row 3: Suggestions tray — hidden in compare mode so both sides
              share the same minimal layout (the reference mirror doesn't
              render a tray). Exit compare mode to access suggestions. */}
          {!isComparing && (
            <SuggestionsTray entry={entry} onAddTrigger={addTrigger} onAddTriggers={addTriggers} />
          )}

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
            diffsFromReference={isComparing && !!compareDelta?.description}
            diffSegments={isComparing ? compareDelta?.description?.segments ?? null : null}
            hideFooter={isComparing}
            labelLeftAdornment={isComparing && compareDelta?.description ? (
              <span className="diff-modified-dot" title="Differs from reference">●</span>
            ) : null}
            labelRightAdornment={isComparing ? (
              <>
                {compareDelta && compareDelta.changedFields.size > 0 && (
                  <div className="copy-menu-wrap">
                    <button
                      className="copy-menu-btn"
                      onClick={(e) => { e.stopPropagation(); setCopyMenuOpen((v) => !v); }}
                      title="Copy a single field from the reference entry"
                      type="button"
                    >
                      ← Copy…
                    </button>
                    {copyMenuOpen && (
                      <>
                        <div className="copy-menu-backdrop" onClick={() => setCopyMenuOpen(false)} />
                        <div className="copy-menu" role="menu">
                          {compareDelta.changedFields.has('name') && (
                            <button className="copy-menu-item" onClick={() => { copyField('name'); setCopyMenuOpen(false); }} type="button">
                              Name
                            </button>
                          )}
                          {compareDelta.changedFields.has('type') && (
                            <button className="copy-menu-item" onClick={() => { copyField('type'); setCopyMenuOpen(false); }} type="button">
                              Type
                            </button>
                          )}
                          {compareDelta.changedFields.has('triggers') && (
                            <button className="copy-menu-item" onClick={() => { copyField('triggers'); setCopyMenuOpen(false); }} type="button">
                              Triggers
                            </button>
                          )}
                          {compareDelta.changedFields.has('description') && (
                            <button className="copy-menu-item" onClick={() => { copyField('description'); setCopyMenuOpen(false); }} type="button">
                              Description
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button
                  className="copy-all-from-ref-btn"
                  onClick={copyAllFromReference}
                  title="Replace every field of this entry with the reference entry's values"
                  type="button"
                >
                  ⇇ Copy All from Reference
                </button>
              </>
            ) : null}
          />

          {/* Row 5: Rollback — hidden in compare mode so both sides share
              the same minimal layout. Exit compare mode to access rollback. */}
          {!isComparing && (<>
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
              title={rollback.enabled ? 'View and restore entry history' : 'Open Settings to enable entry history for this lorebook'}
            >
              {rollback.enabled
                ? `↺ Entry History${rollback.snapshots.length > 0 ? ` (${rollback.snapshots.length})` : ''}`
                : 'Enable entry history?'}
            </button>
            <button
              className={`entry-public-btn${entry.isPublic === true ? ' entry-public-btn--public' : ''}`}
              onClick={() => update({ isPublic: entry.isPublic !== true }, true)}
              title={entry.isPublic === true ? 'Public on CharSnap — click to make private' : 'Private on CharSnap — click to make public'}
            >
              {entry.isPublic === true ? 'Public' : 'Private'}
            </button>
            <button
              className={`hide-from-export-btn${entry.hiddenFromExport ? ' hide-from-export-btn--active' : ''}`}
              onClick={() => update({ hiddenFromExport: !entry.hiddenFromExport }, true)}
              title="Exclude entry from JSON export"
            >
              {entry.hiddenFromExport ? 'Hidden from Export' : 'Hide from Export'}
            </button>
          </div>

          {rollbackOpen && rollback.enabled && (
            <RollbackPanel
              snapshots={rollback.snapshots}
              currentEntry={entry}
              onRestore={rollback.restoreSnapshot}
              onUpdateLabel={rollback.updateSnapshotLabel}
              onTogglePin={rollback.toggleSnapshotPin}
              onDeleteSnapshot={rollback.deleteSnapshot}
              onSaveManual={rollback.saveSnapshot}
              promptSuppressed={rollback.promptSuppressed}
              onReEnablePrompt={rollback.reEnablePrompt}
            />
          )}
          </>)}
        </div>
      )}
    </div>
  );
}

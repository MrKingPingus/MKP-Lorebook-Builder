// Mobile full-screen entry editor — slides over the build panel when an entry is tapped
import { useState, useRef, useEffect } from 'react';
import { useEntryDetail }  from '../../hooks/use-entry-detail.js';
import { useEntries }      from '../../hooks/use-entries.js';
import { useUi }           from '../../hooks/use-ui.js';
import { useSettings }     from '../../hooks/use-settings.js';
import { useCrosstalk }    from '../../hooks/use-crosstalk.js';
import { useNameMatch }    from '../../hooks/use-name-match.js';
import { useReferenceLorebook }     from '../../hooks/use-reference-lorebook.js';
import { useCopyEntryToReference }  from '../../hooks/use-copy-entry-to-reference.js';
import { useRollback }     from '../../hooks/use-rollback.js';
import { TypeSelector }    from './TypeSelector.jsx';
import { TitleCharCounter } from '../ui/TitleCharCounter.jsx';
import { CyclingSelect }   from '../ui/CyclingSelect.jsx';
import { TriggerChips }    from './TriggerChips.jsx';
import { DescriptionArea } from './DescriptionArea.jsx';
import { SuggestionsTray } from './SuggestionsTray.jsx';
import { RollbackPanel }   from './RollbackPanel.jsx';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';

export function EntryDetailPanel() {
  const { activeEntryId, closeEntry } = useEntryDetail();
  const { entries, updateEntry, removeEntry } = useEntries();
  const searchQuery            = useUi((s) => s.searchQuery);
  const pendingFocusEntryId    = useUi((s) => s.pendingFocusEntryId);
  const setPendingFocusEntryId = useUi((s) => s.setPendingFocusEntryId);
  const { triggerDelimiter, setTriggerDelimiter, warningScale } = useSettings();
  const { conflictMap, allowedOverlaps, allowOverlap, allowOverlaps, revokeOverlap } = useCrosstalk();
  const { activeToRef: nameMatchMap } = useNameMatch();
  const setPeekReferenceEntryId = useUi((s) => s.setPeekReferenceEntryId);
  const pickFromReferenceMode   = useUi((s) => s.pickFromReferenceMode);
  const { referenceLorebook, crosstalkEnabled } = useReferenceLorebook();
  const { copyEntryToReference }                = useCopyEntryToReference();
  const nameInputRef = useRef(null);
  const [rollbackOpen, setRollbackOpen]         = useState(false);
  const [copiedFlash,  setCopiedFlash]          = useState(false);

  const entry = entries.find((e) => e.id === activeEntryId) ?? null;

  // useRollback requires a stable entry reference; null-safe via the empty fallback object
  const rollback = useRollback({ entry: entry ?? { id: '', snapshots: [] }, onUpdate: updateEntry });

  // Auto-focus name input when a newly-created entry opens on mobile
  useEffect(() => {
    if (!activeEntryId || pendingFocusEntryId !== activeEntryId) return;
    setPendingFocusEntryId(null);
    nameInputRef.current?.focus();
  }, [activeEntryId, pendingFocusEntryId]);

  const isOpen = !!activeEntryId;

  // Escape leaves the editor the same way Back does — through the rollback
  // collapse-intent prompt, not around it, so a discardable draft is still
  // caught. `handleBack` is a hoisted declaration, hence usable up here.
  useDismissLayer('entry-detail', isOpen, DISMISS_PRIORITY.entryDetail, handleBack);

  function update(patch, discrete = false) {
    if (!entry) return;
    rollback.onBeforeEdit();
    updateEntry(entry.id, patch, discrete);
  }

  function addTrigger(word) {
    if (!entry || entry.triggers.includes(word)) return;
    update({ triggers: [...entry.triggers, word] }, true);
  }

  // Batch-add path for the thesaurus popover (avoids stale-read on synchronous loops)
  function addTriggers(words) {
    if (!entry) return;
    const next = [...entry.triggers];
    for (const w of words) if (!next.includes(w)) next.push(w);
    if (next.length !== entry.triggers.length) update({ triggers: next }, true);
  }

  function handleRemove() {
    if (!entry) return;
    removeEntry(entry.id);
    closeEntry();
  }

  function handleBack() {
    setRollbackOpen(false);
    closeEntry();
  }

  function handleCopyToReference() {
    if (!entry) return;
    const ok = copyEntryToReference(entry);
    if (!ok) return;
    setCopiedFlash(true);
    setTimeout(() => setCopiedFlash(false), 1500);
  }

  return (
    <div className={`entry-detail-panel${isOpen ? ' entry-detail-panel--open' : ''}`}>
      {/* Header */}
      <div className="entry-detail-header">
        <button className="entry-detail-back touch-floor" onClick={handleBack}>
          ← Back
        </button>
        <span className="entry-detail-title">
          {entry?.name || '(unnamed)'}
          {entry && nameMatchMap.has(entry.id) && (
            pickFromReferenceMode ? (
              <span
                className="entry-ref-badge entry-ref-badge--header entry-ref-badge--in-active touch-floor"
                title="Same-named entry already exists in your active book — copying would duplicate"
              >
                in active
              </span>
            ) : (
              <button
                className="entry-ref-badge entry-ref-badge--header touch-floor"
                onClick={() => setPeekReferenceEntryId(nameMatchMap.get(entry.id))}
                title="Same-named entry exists in the reference book — tap to peek"
              >
                in reference <span className="entry-ref-badge-arrow">↗</span>
              </button>
            )
          )}
        </span>
        <button className="entry-detail-remove touch-floor" onClick={handleRemove}>
          Remove
        </button>
      </div>

      {/* Body — only rendered while there is an active entry */}
      {entry && (
        <div className="entry-detail-body">
          {/* Entry Name */}
          <div className="entry-detail-section">
            <div className="field-label">
              ENTRY NAME
              <TitleCharCounter length={entry.name.length} warningScale={warningScale} />
            </div>
            <input
              ref={nameInputRef}
              className="entry-name-field entry-name-field--detail"
              value={entry.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Entry name…"
              spellCheck={false}
            />
          </div>

          {/* Entry Type */}
          <div className="entry-detail-section">
            <div className="field-label">ENTRY TYPE</div>
            <div className="entry-type-dropdown-wrap">
              <TypeSelector value={entry.type} onChange={(type) => update({ type }, true)} />
            </div>
          </div>

          {/* Trigger Keywords */}
          <div className="entry-detail-section">
            <div className="trigger-section-header">
              <div className="field-label">TRIGGER KEYWORDS</div>
              {(() => {
                const entryConflicts = entry.triggers.map((t) => t.toLowerCase()).filter((t) => conflictMap.has(t));
                const unacknowledged = entryConflicts.filter((t) => !allowedOverlaps.includes(t));
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
              <CyclingSelect
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
              </CyclingSelect>
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
            />
          </div>

          {/* Suggestions */}
          <SuggestionsTray entry={entry} onAddTrigger={addTrigger} onAddTriggers={addTriggers} />

          {/* Description */}
          <DescriptionArea
            value={entry.description}
            onChange={(description) => update({ description })}
          />

          {/* Rollback */}
          <div className="entry-detail-section">
            <div className="rollback-footer">
              <button
                className={`rollback-toggle-btn touch-floor${rollback.enabled ? '' : ' rollback-toggle-btn--disabled'}`}
                onClick={() => {
                  if (rollback.enabled) {
                    setRollbackOpen((o) => !o);
                  } else {
                    // See EntryCard: the button enables rather than navigating.
                    rollback.setRollbackEnabled(true);
                    setRollbackOpen(true);
                  }
                }}
                title={rollback.enabled
                  ? (rollback.hasUnsavedChanges
                      ? 'Edited since your newest checkpoint — open to save one'
                      : 'View and restore entry checkpoints')
                  : 'Turn on checkpoints for this lorebook'}
              >
                {rollback.enabled ? (
                  <>
                    {rollback.hasUnsavedChanges && (
                      <span className="rollback-unsaved-dot" aria-hidden="true" />
                    )}
                    {`↺ Checkpoints${rollback.snapshots.length > 0 ? ` (${rollback.snapshots.length})` : ''}`}
                  </>
                ) : 'Enable checkpoints'}
              </button>
              <button
                className={`entry-public-btn touch-floor${entry.isPublic === true ? ' entry-public-btn--public' : ''}`}
                onClick={() => update({ isPublic: entry.isPublic !== true }, true)}
                title={entry.isPublic === true ? 'Public on CharSnap — click to make private' : 'Private on CharSnap — click to make public'}
              >
                {entry.isPublic === true ? 'Public' : 'Private'}
              </button>
              <button
                className={`hide-from-export-btn touch-floor${entry.hiddenFromExport ? ' hide-from-export-btn--active' : ''}`}
                onClick={() => update({ hiddenFromExport: !entry.hiddenFromExport }, true)}
                title="Exclude entry from JSON export"
              >
                {entry.hiddenFromExport ? 'Hidden from Export' : 'Hide from Export'}
              </button>
              {crosstalkEnabled && referenceLorebook && (
                <button
                  className={`copy-to-reference-btn${copiedFlash ? ' copy-to-reference-btn--flash' : ''}`}
                  onClick={handleCopyToReference}
                  title={`Copy this entry into ${referenceLorebook.name || 'the reference lorebook'}`}
                  type="button"
                >
                  {copiedFlash ? '✓ Copied' : '↗ Copy to Reference'}
                </button>
              )}
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
                onOverwrite={rollback.overwriteSnapshot}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

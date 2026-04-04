// Mobile full-screen entry editor — slides over the build panel when an entry is tapped
import { useState, useRef, useEffect } from 'react';
import { useEntryDetail }  from '../../hooks/use-entry-detail.js';
import { useEntries }      from '../../hooks/use-entries.js';
import { useUi }           from '../../hooks/use-ui.js';
import { useSettings }     from '../../hooks/use-settings.js';
import { useCrosstalk }    from '../../hooks/use-crosstalk.js';
import { ENTRY_TYPES }     from '../../constants/entry-types.js';
import { TypeSelector }    from './TypeSelector.jsx';
import { TriggerChips }    from './TriggerChips.jsx';
import { DescriptionArea } from './DescriptionArea.jsx';
import { SuggestionsTray } from './SuggestionsTray.jsx';

export function EntryDetailPanel() {
  const { activeEntryId, closeEntry } = useEntryDetail();
  const { entries, updateEntry, removeEntry } = useEntries();
  const searchQuery            = useUi((s) => s.searchQuery);
  const pendingFocusEntryId    = useUi((s) => s.pendingFocusEntryId);
  const setPendingFocusEntryId = useUi((s) => s.setPendingFocusEntryId);
  const { entryTypeView, triggerDelimiter, setTriggerDelimiter } = useSettings();
  const { conflictMap, allowedOverlaps, allowOverlap, revokeOverlap } = useCrosstalk();
  const nameInputRef = useRef(null);

  const entry = entries.find((e) => e.id === activeEntryId) ?? null;

  // Auto-focus name input when a newly-created entry opens on mobile
  useEffect(() => {
    if (!activeEntryId || pendingFocusEntryId !== activeEntryId) return;
    setPendingFocusEntryId(null);
    nameInputRef.current?.focus();
  }, [activeEntryId, pendingFocusEntryId]);

  const isOpen = !!activeEntryId;

  function update(patch) {
    if (!entry) return;
    updateEntry(entry.id, patch);
  }

  function addTrigger(word) {
    if (!entry || entry.triggers.includes(word)) return;
    update({ triggers: [...entry.triggers, word] });
  }

  function handleRemove() {
    if (!entry) return;
    removeEntry(entry.id);
    closeEntry();
  }

  return (
    <div className={`entry-detail-panel${isOpen ? ' entry-detail-panel--open' : ''}`}>
      {/* Header */}
      <div className="entry-detail-header">
        <button className="entry-detail-back" onClick={closeEntry}>
          ← Back
        </button>
        <span className="entry-detail-title">{entry?.name || '(unnamed)'}</span>
        <button className="entry-detail-remove" onClick={handleRemove}>
          Remove
        </button>
      </div>

      {/* Body — only rendered while there is an active entry */}
      {entry && (
        <div className="entry-detail-body">
          {/* Entry Name */}
          <div className="entry-detail-section">
            <div className="field-label">ENTRY NAME</div>
            <input
              ref={nameInputRef}
              className="entry-name-field entry-name-field--detail"
              value={entry.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Entry name…"
              spellCheck={false}
            />
          </div>

          {/* Entry Type — dropdown (default) or full button grid (setting) */}
          <div className="entry-detail-section">
            <div className="field-label">ENTRY TYPE</div>
            {entryTypeView === 'buttons' ? (
              <div className="entry-type-buttons">
                {ENTRY_TYPES.map((t) => {
                  const active = entry.type === t.id;
                  return (
                    <button
                      key={t.id}
                      className={`entry-type-btn${active ? ' entry-type-btn--active' : ''}`}
                      style={active ? { background: t.color, borderColor: t.color, color: '#fff' } : {}}
                      onClick={() => update({ type: t.id })}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="entry-type-dropdown-wrap">
                <TypeSelector value={entry.type} onChange={(type) => update({ type })} />
              </div>
            )}
          </div>

          {/* Trigger Keywords */}
          <div className="entry-detail-section">
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

          {/* Suggestions */}
          <SuggestionsTray entry={entry} onAddTrigger={addTrigger} />

          {/* Description */}
          <DescriptionArea
            value={entry.description}
            onChange={(description) => update({ description })}
          />
        </div>
      )}
    </div>
  );
}

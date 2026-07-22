// Rollback panel: snapshot list and snapshot preview (stacked current/snapshot display)
import { useState }     from 'react';
import { useKeybindings } from '../../hooks/use-keybindings.js';
import { ENTRY_TYPES }  from '../../constants/entry-types.js';
import { diffEntries }  from '../../services/diff-service.js';

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function RollbackPanel({ snapshots, currentEntry, onRestore, onUpdateLabel, onTogglePin, onDeleteSnapshot, onSaveManual, promptSuppressed, onReEnablePrompt }) {
  const [view, setView]                       = useState('list'); // 'list' | 'preview'
  const [previewIndex, setPreviewIndex]       = useState(null);
  const [editingLabelIdx, setEditingLabelIdx] = useState(null);
  const [labelDraft, setLabelDraft]           = useState('');
  const [diffOn, setDiffOn]                   = useState(false);
  const { displayChord }                      = useKeybindings();

  function openPreview(i) {
    setPreviewIndex(i);
    setView('preview');
  }

  function backToList() {
    setView('list');
    setPreviewIndex(null);
    setDiffOn(false);
  }

  function commitLabel(i) {
    onUpdateLabel(i, labelDraft.trim());
    setEditingLabelIdx(null);
  }

  // ── Snapshot list ─────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="rollback-panel">
        <div className="rollback-panel-header">
          <span className="rollback-panel-title">Snapshots</span>
          <button className="rollback-save-btn" onClick={onSaveManual} title="Save a snapshot of the current state">
            + Save now
          </button>
        </div>

        {snapshots.length === 0 ? (
          <div className="rollback-empty">
            No snapshots yet. One is saved automatically before your first edit.
          </div>
        ) : (
          <div className="rollback-list">
            {snapshots.map((snap, i) => (
              <div key={snap.timestamp} className="rollback-item">
                {/* Pin button — left of label */}
                <button
                  className={`rollback-action-btn rollback-pin-btn${snap.pinned ? ' rollback-pin-btn--active' : ''}`}
                  title={snap.pinned ? 'Unpin (snapshot may be overwritten when count is full)' : 'Pin (protect from being overwritten)'}
                  onClick={() => onTogglePin(i)}
                >
                  📌
                </button>

                {editingLabelIdx === i ? (
                  <input
                    className="rollback-label-input"
                    value={labelDraft}
                    autoFocus
                    placeholder="Label (optional)…"
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onBlur={() => commitLabel(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') commitLabel(i);
                    }}
                  />
                ) : (
                  <button
                    className="rollback-item-label"
                    onClick={() => openPreview(i)}
                    title="Click to review and restore"
                  >
                    {snap.label || formatTimestamp(snap.timestamp)}
                  </button>
                )}

                <div className="rollback-item-actions">
                  <button
                    className="rollback-action-btn"
                    title="Edit label"
                    onClick={() => {
                      setLabelDraft(snap.label || '');
                      setEditingLabelIdx(i);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="rollback-action-btn rollback-action-btn--delete"
                    title="Delete snapshot"
                    onClick={() => {
                      if (previewIndex === i) backToList();
                      onDeleteSnapshot(i);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {promptSuppressed && (
          <div className="rollback-suppress-notice">
            Save prompt is silenced this session.{' '}
            <button className="rollback-reenable-btn" onClick={onReEnablePrompt}>
              Re-enable
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Snapshot preview ──────────────────────────────────────────────────────
  const snap    = snapshots[previewIndex];
  const typeDef = snap ? ENTRY_TYPES.find((t) => t.id === snap.type) : null;

  if (!snap) { backToList(); return null; }

  // Diff is computed snapshot → current ("what changed since the snapshot").
  // The preview shows the snapshot (the older state), so:
  //   - 'del' segments = text that was removed since the snapshot (i.e. only
  //     in the snapshot)
  //   - 'add' segments = text that was added since the snapshot (i.e. only
  //     in the current entry)
  //   - 'same' = present in both
  // Triggers row uses delta.triggers which already labels by direction.
  const delta            = diffOn && currentEntry ? diffEntries(snap, currentEntry) : null;
  const changedCount     = delta ? delta.changedFields.size : 0;
  const isFieldChanged   = (name) => delta?.changedFields.has(name) ?? false;

  return (
    <div className="rollback-panel rollback-panel--preview">
      <div className="rollback-panel-header">
        <button className="rollback-back-btn" onClick={backToList}>
          ← Snapshots
        </button>
        <span className="rollback-panel-title">
          {snap.pinned && <span className="rollback-pin-indicator" title="Pinned">📌 </span>}
          {snap.label || formatTimestamp(snap.timestamp)}
        </span>
      </div>

      {currentEntry && (
        <div className="rollback-diff-bar">
          <button
            className={`rollback-diff-toggle${diffOn ? ' rollback-diff-toggle--on' : ''}`}
            onClick={() => setDiffOn((v) => !v)}
            type="button"
            title="Compare snapshot to current entry"
          >
            {diffOn ? '✓ ' : ''}Highlight Differences
          </button>
          {diffOn && (
            <span className="rollback-diff-count">
              {changedCount === 0
                ? 'No differences'
                : `${changedCount} field${changedCount === 1 ? '' : 's'} changed`}
            </span>
          )}
        </div>
      )}

      <div className="rollback-preview-body">
        <div className="rollback-preview-row">
          <span className="rollback-preview-label">
            {diffOn && isFieldChanged('name') && <span className="diff-modified-dot" title="Field changed since snapshot">●</span>}
            Name
          </span>
          <span className="rollback-preview-value">
            {snap.name || '(unnamed)'}
            {diffOn && delta?.name && (
              <span className="diff-after-hint"> → {delta.name.after || '(unnamed)'}</span>
            )}
          </span>
        </div>
        <div className="rollback-preview-row">
          <span className="rollback-preview-label">
            {diffOn && isFieldChanged('type') && <span className="diff-modified-dot" title="Field changed since snapshot">●</span>}
            Type
          </span>
          <span className="rollback-preview-value" style={{ color: typeDef?.color ?? 'inherit' }}>
            {typeDef?.label ?? snap.type}
            {diffOn && delta?.type && (
              <span className="diff-after-hint" style={{ color: 'var(--muted)' }}>
                {' '}→ {ENTRY_TYPES.find((t) => t.id === delta.type.after)?.label ?? delta.type.after}
              </span>
            )}
          </span>
        </div>
        <div className="rollback-preview-row">
          <span className="rollback-preview-label">
            {diffOn && isFieldChanged('triggers') && <span className="diff-modified-dot" title="Field changed since snapshot">●</span>}
            Triggers
          </span>
          <span className="rollback-preview-value">
            {!diffOn ? (
              snap.triggers.length === 0 ? '(none)' : snap.triggers.join(', ')
            ) : (
              <span className="diff-trigger-row">
                {delta?.triggers.common.map((t) => (
                  <span key={`c-${t}`} className="diff-trigger diff-trigger--same">{t}</span>
                ))}
                {delta?.triggers.removed.map((t) => (
                  <span key={`r-${t}`} className="diff-trigger diff-trigger--removed" title="Removed since snapshot">{t}</span>
                ))}
                {delta?.triggers.added.map((t) => (
                  <span key={`a-${t}`} className="diff-trigger diff-trigger--added" title="Added since snapshot">{t}</span>
                ))}
                {delta && delta.triggers.common.length + delta.triggers.added.length + delta.triggers.removed.length === 0 && (
                  <span className="diff-trigger diff-trigger--empty">(none on either side)</span>
                )}
              </span>
            )}
          </span>
        </div>
        <div className="rollback-preview-row rollback-preview-row--desc">
          <span className="rollback-preview-label">
            {diffOn && isFieldChanged('description') && <span className="diff-modified-dot" title="Field changed since snapshot">●</span>}
            Description
          </span>
          <div className="rollback-preview-description">
            {!diffOn || !delta?.description ? (
              snap.description || '(empty)'
            ) : (
              delta.description.segments.map((seg, i) => (
                <span key={i} className={`diff-seg diff-seg--${seg.kind}`}>{seg.text}</span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rollback-restore-row">
        <button
          className="rollback-restore-btn"
          onClick={() => { onRestore(snap); backToList(); }}
        >
          Restore this snapshot
        </button>
        <span className="rollback-restore-hint">This action can be undone via {displayChord('undo')}.</span>
      </div>
    </div>
  );
}

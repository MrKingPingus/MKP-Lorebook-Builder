// Rollback panel: snapshot list and snapshot preview (stacked current/snapshot display)
import { useState }    from 'react';
import { ENTRY_TYPES } from '../../constants/entry-types.js';

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function RollbackPanel({ snapshots, onRestore, onUpdateLabel, onTogglePin, onDeleteSnapshot, onSaveManual, promptSuppressed, onReEnablePrompt }) {
  const [view, setView]                       = useState('list'); // 'list' | 'preview'
  const [previewIndex, setPreviewIndex]       = useState(null);
  const [editingLabelIdx, setEditingLabelIdx] = useState(null);
  const [labelDraft, setLabelDraft]           = useState('');

  function openPreview(i) {
    setPreviewIndex(i);
    setView('preview');
  }

  function backToList() {
    setView('list');
    setPreviewIndex(null);
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

      <div className="rollback-preview-body">
        <div className="rollback-preview-row">
          <span className="rollback-preview-label">Name</span>
          <span className="rollback-preview-value">{snap.name || '(unnamed)'}</span>
        </div>
        <div className="rollback-preview-row">
          <span className="rollback-preview-label">Type</span>
          <span className="rollback-preview-value" style={{ color: typeDef?.color ?? 'inherit' }}>
            {typeDef?.label ?? snap.type}
          </span>
        </div>
        <div className="rollback-preview-row">
          <span className="rollback-preview-label">Triggers</span>
          <span className="rollback-preview-value">
            {snap.triggers.length === 0 ? '(none)' : snap.triggers.join(', ')}
          </span>
        </div>
        <div className="rollback-preview-row rollback-preview-row--desc">
          <span className="rollback-preview-label">Description</span>
          <div className="rollback-preview-description">
            {snap.description || '(empty)'}
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
        <span className="rollback-restore-hint">This action can be undone via Ctrl+Z.</span>
      </div>
    </div>
  );
}

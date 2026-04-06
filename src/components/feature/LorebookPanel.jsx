// Lorebook list as a first-class panel — always-expanded version of the switcher dropdown for the menu panel
import { useState, useRef, useEffect } from 'react';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useLorebook }          from '../../hooks/use-lorebook.js';
import { useExport }            from '../../hooks/use-export.js';

export function LorebookPanel() {
  const { items, createLorebook, switchLorebook, deleteLorebook, renameLorebookById } = useLorebookSwitcher();
  const [pendingId, setPendingId]             = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingId, setEditingId]             = useState(null);
  const [editingName, setEditingName]         = useState('');
  const editInputRef = useRef(null);
  const { activeLorebookId, activeLorebook } = useLorebook();
  const { exportJson: doExportJson, exportTxt: doExportTxt } = useExport();

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  function requestSwitch(id) {
    if (id === activeLorebookId) return;
    if (activeLorebook?.entries?.length > 0) {
      setPendingId(id);
    } else {
      switchLorebook(id);
    }
  }

  function doSwitch() {
    if (pendingId) switchLorebook(pendingId);
    setPendingId(null);
  }

  function downloadJson() {
    if (activeLorebook) {
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      doExportJson(activeLorebook, `${safe}.json`);
    }
    doSwitch();
  }

  function downloadTxt() {
    if (activeLorebook) {
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      doExportTxt(activeLorebook, `${safe}.txt`);
    }
    doSwitch();
  }

  function handleDeleteClick(e, id) {
    e.stopPropagation();
    setConfirmDeleteId(id);
  }

  function startEditing(e, item) {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingName(item.name || '');
  }

  function commitRename() {
    if (editingId) {
      renameLorebookById(editingId, editingName);
    }
    setEditingId(null);
  }

  function onEditKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { setEditingId(null); }
  }

  const pendingName = pendingId
    ? (items.find((i) => i.id === pendingId)?.name || '(unnamed)')
    : '';

  const confirmDeleteName = confirmDeleteId
    ? (items.find((i) => i.id === confirmDeleteId)?.name || '(unnamed)')
    : '';

  return (
    <div className="lorebook-panel">
      {pendingId && (
        <div className="lorebook-panel-prompt">
          <div className="switcher-prompt-text">
            Switch to &ldquo;{pendingName}&rdquo;? Save current lorebook first?
          </div>
          <div className="switcher-prompt-actions">
            <button className="switcher-prompt-btn" onClick={downloadJson}>⬇ JSON</button>
            <button className="switcher-prompt-btn" onClick={downloadTxt}>⬇ TXT</button>
            <button className="switcher-prompt-btn" onClick={doSwitch}>Switch anyway</button>
            <button className="switcher-prompt-btn switcher-prompt-btn--cancel" onClick={() => setPendingId(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="switcher-list">
        {items.length === 0 && (
          <div className="switcher-empty">No lorebooks yet</div>
        )}
        {items.map((item) => (
          <div key={item.id}>
            <div
              className={`switcher-item${item.isActive ? ' switcher-item--active' : ''}`}
              onClick={() => { if (editingId !== item.id) requestSwitch(item.id); }}
            >
              {editingId === item.id ? (
                <input
                  ref={editInputRef}
                  className="switcher-rename-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={onEditKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="switcher-name"
                  title="Double-click to rename"
                  onDoubleClick={(e) => startEditing(e, item)}
                >
                  {item.name || '(unnamed)'}
                </span>
              )}
              <span className="switcher-time">{item.relativeTime}</span>
              <button
                className="switcher-delete"
                onClick={(e) => handleDeleteClick(e, item.id)}
                title="Delete lorebook"
              >
                ×
              </button>
            </div>

            {/* Inline delete confirmation */}
            {confirmDeleteId === item.id && (
              <div className="switcher-confirm-delete" onClick={(e) => e.stopPropagation()}>
                <span className="switcher-confirm-label">
                  Delete &ldquo;{confirmDeleteName}&rdquo;?
                </span>
                <div className="switcher-confirm-actions">
                  <button
                    className="switcher-confirm-btn switcher-confirm-btn--danger"
                    onClick={() => { deleteLorebook(confirmDeleteId); setConfirmDeleteId(null); }}
                  >
                    Yes
                  </button>
                  <button
                    className="switcher-confirm-btn"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    No
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="switcher-new" onClick={createLorebook}>
        + New lorebook
      </button>
    </div>
  );
}

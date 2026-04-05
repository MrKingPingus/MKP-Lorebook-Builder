// Dropdown listing up to 10 saved lorebooks with relative timestamps, per-item delete, and save prompt
import { useState, useRef, useEffect } from 'react';
import { useLorebookSwitcher } from '../../hooks/use-lorebook-switcher.js';
import { useLorebook }         from '../../hooks/use-lorebook.js';
import { useExport }           from '../../hooks/use-export.js';
import { useMobile }           from '../../hooks/use-mobile.js';

export function LorebookSwitcher() {
  const { items, createLorebook, switchLorebook, deleteLorebook, renameLorebookById } = useLorebookSwitcher();
  const [open, setOpen]               = useState(false);
  const [pendingId, setPendingId]     = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editingName, setEditingName] = useState('');
  const wrapperRef    = useRef(null);
  const confirmInputRef = useRef(null);
  const editInputRef  = useRef(null);
  const isMobile = useMobile();

  useEffect(() => {
    function onMouseDown(e) {
      if (!open && !pendingId) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setPendingId(null);
        setConfirmDeleteId(null);
        setConfirmText('');
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, pendingId]);

  // Focus confirm input when delete confirmation opens
  useEffect(() => {
    if (confirmDeleteId && confirmInputRef.current) {
      confirmInputRef.current.focus();
    }
  }, [confirmDeleteId]);

  // Focus edit input when inline rename opens
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const { activeLorebookId, activeLorebook } = useLorebook();
  const { exportJson: doExportJson, exportTxt: doExportTxt } = useExport();

  function requestSwitch(id) {
    if (id === activeLorebookId) { setOpen(false); return; }
    const hasEntries = activeLorebook?.entries?.length > 0;
    if (hasEntries) {
      setPendingId(id);
    } else {
      switchLorebook(id);
      setOpen(false);
    }
  }

  function doSwitch() {
    if (pendingId) switchLorebook(pendingId);
    setPendingId(null);
    setOpen(false);
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

  function cancelPrompt() {
    setPendingId(null);
  }

  function handleDeleteClick(e, id) {
    e.stopPropagation();
    if (isMobile) {
      const name = items.find((i) => i.id === id)?.name || '(unnamed)';
      if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
        deleteLorebook(id);
      }
    } else {
      setConfirmDeleteId(id);
      setConfirmText('');
    }
  }

  function commitDelete() {
    if (confirmText === 'Yes' && confirmDeleteId) {
      deleteLorebook(confirmDeleteId);
    }
    setConfirmDeleteId(null);
    setConfirmText('');
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
    setConfirmText('');
  }

  function handleCreate() {
    createLorebook();
    setOpen(false);
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
    <div className="lorebook-switcher" ref={wrapperRef}>
      <button
        className="switcher-btn"
        onClick={() => setOpen((v) => !v)}
        title="Switch lorebook"
        onPointerDown={(e) => e.stopPropagation()}
      >
        ☰
      </button>

      {/* Save prompt */}
      {pendingId && (
        <div className="switcher-prompt" onPointerDown={(e) => e.stopPropagation()}>
          <div className="switcher-prompt-text">
            Switch to &ldquo;{pendingName}&rdquo;? Save current lorebook first?
          </div>
          <div className="switcher-prompt-actions">
            <button className="switcher-prompt-btn" onClick={downloadJson}>⬇ JSON</button>
            <button className="switcher-prompt-btn" onClick={downloadTxt}>⬇ TXT</button>
            <button className="switcher-prompt-btn" onClick={doSwitch}>Switch anyway</button>
            <button className="switcher-prompt-btn switcher-prompt-btn--cancel" onClick={cancelPrompt}>Cancel</button>
          </div>
        </div>
      )}

      {open && (
        <div className="switcher-dropdown" onPointerDown={(e) => e.stopPropagation()}>
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
                      title="Click to rename"
                      onClick={(e) => startEditing(e, item)}
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

                {/* Desktop delete confirmation inline */}
                {!isMobile && confirmDeleteId === item.id && (
                  <div className="switcher-confirm-delete" onClick={(e) => e.stopPropagation()}>
                    <span className="switcher-confirm-label">
                      Type &ldquo;Yes&rdquo; to delete &ldquo;{confirmDeleteName}&rdquo;
                    </span>
                    <input
                      ref={confirmInputRef}
                      className="switcher-confirm-input"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitDelete(); if (e.key === 'Escape') cancelDelete(); }}
                      placeholder="Yes"
                    />
                    <div className="switcher-confirm-actions">
                      <button
                        className="switcher-confirm-btn switcher-confirm-btn--danger"
                        onClick={commitDelete}
                        disabled={confirmText !== 'Yes'}
                      >
                        Delete
                      </button>
                      <button className="switcher-confirm-btn" onClick={cancelDelete}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="switcher-new" onClick={handleCreate}>
            + New lorebook
          </button>
        </div>
      )}
    </div>
  );
}

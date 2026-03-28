// Dropdown listing up to 10 saved lorebooks with relative timestamps, per-item delete, and save prompt
import { useState, useRef, useEffect } from 'react';
import { useLorebookSwitcher } from '../../hooks/use-lorebook-switcher.js';
import { useLorebookStore }    from '../../state/lorebook-store.js';
import { exportToJsonBlob, downloadBlob } from '../../services/json-export.js';
import { exportToTxtBlob }               from '../../services/txt-export.js';

export function LorebookSwitcher() {
  const { items, createLorebook, switchLorebook, deleteLorebook } = useLorebookSwitcher();
  const [open, setOpen]           = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function onMouseDown(e) {
      if (!open && !pendingId) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setPendingId(null);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, pendingId]);

  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebook   = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;

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
      const blob = exportToJsonBlob(activeLorebook);
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      downloadBlob(blob, `${safe}.json`);
    }
    doSwitch();
  }

  function downloadTxt() {
    if (activeLorebook) {
      const blob = exportToTxtBlob(activeLorebook);
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      downloadBlob(blob, `${safe}.txt`);
    }
    doSwitch();
  }

  function cancelPrompt() {
    setPendingId(null);
  }

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteLorebook(id);
  }

  function handleCreate() {
    createLorebook();
    setOpen(false);
  }

  const pendingName = pendingId
    ? (items.find((i) => i.id === pendingId)?.name || '(unnamed)')
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
              <div
                key={item.id}
                className={`switcher-item${item.isActive ? ' switcher-item--active' : ''}`}
                onClick={() => requestSwitch(item.id)}
              >
                <span className="switcher-name">{item.name || '(unnamed)'}</span>
                <span className="switcher-time">{item.relativeTime}</span>
                <button
                  className="switcher-delete"
                  onClick={(e) => handleDelete(e, item.id)}
                  title="Delete lorebook"
                >
                  ×
                </button>
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

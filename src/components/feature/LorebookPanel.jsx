// Lorebook list as a first-class panel — always-expanded version of the switcher dropdown for the menu panel
import { useState }             from 'react';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useLorebook }          from '../../hooks/use-lorebook.js';
import { useExport }            from '../../hooks/use-export.js';

export function LorebookPanel() {
  const { items, createLorebook, switchLorebook, deleteLorebook } = useLorebookSwitcher();
  const [pendingId, setPendingId] = useState(null);
  const { activeLorebookId, activeLorebook } = useLorebook();
  const { exportJson: doExportJson, exportTxt: doExportTxt } = useExport();

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

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteLorebook(id);
  }

  const pendingName = pendingId
    ? (items.find((i) => i.id === pendingId)?.name || '(unnamed)')
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

      <button className="switcher-new" onClick={createLorebook}>
        + New lorebook
      </button>
    </div>
  );
}

// Dropdown listing up to 10 saved lorebooks with relative timestamps and per-item delete buttons
import { useState, useRef } from 'react';
import { useLorebookSwitcher } from '../../hooks/use-lorebook-switcher.js';

export function LorebookSwitcher() {
  const { items, createLorebook, switchLorebook, deleteLorebook } = useLorebookSwitcher();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  function handleSwitch(id) {
    switchLorebook(id);
    setOpen(false);
  }

  function handleDelete(e, id) {
    e.stopPropagation();
    deleteLorebook(id);
  }

  function handleCreate() {
    createLorebook();
    setOpen(false);
  }

  return (
    <div className="lorebook-switcher">
      <button
        ref={btnRef}
        className="switcher-btn"
        onClick={() => setOpen((v) => !v)}
        title="Switch lorebook"
        onPointerDown={(e) => e.stopPropagation()}
      >
        ☰
      </button>
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
                onClick={() => handleSwitch(item.id)}
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

// Header menu button — opens a dropdown to select a side panel (Lorebooks, Import/Export, Settings)
import { useState, useRef, useEffect } from 'react';
import { useUi } from '../../hooks/use-ui.js';

const ITEMS = [
  { id: 'lorebooks',     label: 'Lorebooks' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'settings',      label: 'Settings' },
];

export function MenuButton() {
  const [open, setOpen]        = useState(false);
  const wrapperRef             = useRef(null);
  const activeMenuPanel        = useUi((s) => s.activeMenuPanel);
  const setActiveMenuPanel     = useUi((s) => s.setActiveMenuPanel);

  useEffect(() => {
    function onMouseDown(e) {
      if (!open) return;
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  function handleItem(id) {
    setActiveMenuPanel(id);
    setOpen(false);
  }

  return (
    <div className="menu-btn-wrap" ref={wrapperRef} onPointerDown={(e) => e.stopPropagation()}>
      <button
        className={`menu-btn${open ? ' menu-btn--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Menu"
      >
        ☰
      </button>

      {open && (
        <div className="menu-dropdown">
          {ITEMS.map((item) => (
            <button
              key={item.id}
              className={`menu-dropdown-item${activeMenuPanel === item.id ? ' menu-dropdown-item--active' : ''}`}
              onClick={() => handleItem(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

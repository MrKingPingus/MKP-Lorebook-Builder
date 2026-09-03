// Header menu button.
//
// By default this is a gear that opens Settings in one click. The title
// dropdown carries lorebooks and import/export now, so a menu whose only real
// remaining destination is Settings is a dropdown standing between the user and
// the one thing it offers.
//
// Turning on "Legacy menus" in Settings restores the ☰ dropdown with all three
// side panels, for anyone who prefers the old routes. The side panels
// themselves always exist either way — this only decides whether the header
// offers a way into them.
import { useState, useRef, useEffect } from 'react';
import { useUi }       from '../../hooks/use-ui.js';
import { useSettings } from '../../hooks/use-settings.js';
import { useHostMode } from '../../hooks/use-host.js';

const ITEMS = [
  { id: 'lorebooks',     label: 'Lorebooks' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'settings',      label: 'Settings' },
];

function GearIcon() {
  return (
    <svg className="header-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function MenuButton() {
  const [open, setOpen]        = useState(false);
  const wrapperRef             = useRef(null);
  const activeMenuPanel        = useUi((s) => s.activeMenuPanel);
  const setActiveMenuPanel     = useUi((s) => s.setActiveMenuPanel);
  const { legacyMenus }        = useSettings();
  // Host mode: no Lorebooks panel — CharSnap decides which book is open.
  const hostMode               = useHostMode();
  const items                  = hostMode ? ITEMS.filter((i) => i.id !== 'lorebooks') : ITEMS;

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

  if (!legacyMenus) {
    const settingsOpen = activeMenuPanel === 'settings';
    return (
      <div className="menu-btn-wrap" onPointerDown={(e) => e.stopPropagation()}>
        <button
          className={`menu-btn menu-btn--gear touch-floor${settingsOpen ? ' menu-btn--open' : ''}`}
          onClick={() => setActiveMenuPanel(settingsOpen ? null : 'settings')}
          title="Settings"
          aria-label="Settings"
          aria-pressed={settingsOpen}
        >
          <GearIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="menu-btn-wrap" ref={wrapperRef} onPointerDown={(e) => e.stopPropagation()}>
      <button
        className={`menu-btn${open ? ' menu-btn--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Menu"
        aria-label="Menu"
        aria-expanded={open}
      >
        ☰
      </button>

      {open && (
        <div className="menu-dropdown">
          {items.map((item) => (
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

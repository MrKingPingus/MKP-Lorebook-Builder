// Window title bar — logo, lorebook name, lorebook count badge, inline tabs, close button
import { useRef, useEffect } from 'react';
import { useDragWindow }  from '../../hooks/use-drag-window.js';
import { useLorebook }    from '../../hooks/use-lorebook.js';
import { useUiStore }     from '../../state/ui-store.js';
import { useLorebookStore } from '../../state/lorebook-store.js';

const TABS = [
  { id: 'build',         label: 'Build' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'settings',      label: 'Settings' },
];

function nameWidth(name) {
  return Math.max(12, (name?.length ?? 0) + 2) + 'ch';
}

export function WindowHeader() {
  const { onPointerDown }          = useDragWindow();
  const { activeLorebook, renameLorebook } = useLorebook();
  const activeTab                  = useUiStore((s) => s.activeTab);
  const setActiveTab               = useUiStore((s) => s.setActiveTab);
  const lorebookIndex              = useLorebookStore((s) => s.lorebookIndex);
  const nameRef                    = useRef(null);

  // Sync width when the active lorebook changes (e.g. on load or switch)
  useEffect(() => {
    if (nameRef.current) {
      nameRef.current.style.width = nameWidth(activeLorebook?.name);
    }
  }, [activeLorebook?.name]);

  function handleNameChange(e) {
    renameLorebook(e.target.value);
    if (nameRef.current) {
      nameRef.current.style.width = nameWidth(e.target.value);
    }
  }

  return (
    <div className="window-header" onPointerDown={onPointerDown}>
      {/* Logo */}
      <div className="header-logo" onPointerDown={(e) => e.stopPropagation()}>
        <span className="logo-icon">📖</span>
        <span className="logo-text">LOREBOOK BUILDER</span>
      </div>

      {/* Lorebook name — auto-resizing */}
      <input
        ref={nameRef}
        className="lorebook-name-input"
        value={activeLorebook?.name ?? ''}
        onChange={handleNameChange}
        placeholder="Lorebook name…"
        onPointerDown={(e) => e.stopPropagation()}
        spellCheck={false}
      />

      {/* Lorebook count badge */}
      <button
        className="lorebook-count-badge"
        title="Lorebook list"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setActiveTab('settings')}
      >
        🗒 {lorebookIndex.length || 1}
      </button>

      {/* Inline tabs */}
      <nav className="header-tabs" onPointerDown={(e) => e.stopPropagation()}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`header-tab${activeTab === tab.id ? ' header-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Close / no-op */}
      <button
        className="header-close"
        title="Close (no-op in browser)"
        onPointerDown={(e) => e.stopPropagation()}
      >
        ×
      </button>
    </div>
  );
}

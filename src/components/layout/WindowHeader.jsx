// Window title bar — logo, lorebook name, lorebook switcher, inline tabs, close button
import { useDragWindow }    from '../../hooks/use-drag-window.js';
import { useLorebook }      from '../../hooks/use-lorebook.js';
import { useMobile }        from '../../hooks/use-mobile.js';
import { useUi }            from '../../hooks/use-ui.js';
import { LorebookSwitcher } from '../feature/LorebookSwitcher.jsx';

const TABS = [
  { id: 'build',         label: 'Build' },
  { id: 'import-export', label: 'Import / Export' },
  { id: 'settings',      label: 'Settings' },
];

export function WindowHeader() {
  const isMobile                           = useMobile();
  const { onPointerDown }                  = useDragWindow();
  const { activeLorebook, renameLorebook } = useLorebook();
  const activeTab                          = useUi((s) => s.activeTab);
  const setActiveTab                       = useUi((s) => s.setActiveTab);

  return (
    <div
      className="window-header"
      onPointerDown={isMobile ? undefined : onPointerDown}
    >
      {/* Logo */}
      <div className="header-logo" onPointerDown={(e) => e.stopPropagation()}>
        <span className="logo-icon">📖</span>
        <span className="logo-text">LOREBOOK BUILDER</span>
      </div>

      {/* Lorebook name — auto-sizes to content, centered in flex-grow region */}
      <div className="lorebook-name-sizer">
        <input
          className="lorebook-name-input"
          value={activeLorebook?.name ?? ''}
          onChange={(e) => renameLorebook(e.target.value)}
          placeholder="Lorebook name…"
          size={Math.max(10, (activeLorebook?.name?.length ?? 0) + 2)}
          onPointerDown={(e) => e.stopPropagation()}
          spellCheck={false}
        />
      </div>

      {/* Lorebook switcher */}
      <div onPointerDown={(e) => e.stopPropagation()}>
        <LorebookSwitcher />
      </div>

      {/* Inline tabs — hidden on mobile (tabs live in MobileNav on mobile) */}
      {!isMobile && (
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
      )}

      {/* Close — no-op in browser; hidden on mobile (no floating window to close) */}
      {!isMobile && (
        <button
          className="header-close"
          title="Close (no-op in browser)"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      )}
    </div>
  );
}

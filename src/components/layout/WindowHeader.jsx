// Window title bar — logo, lorebook name, menu button, close button
import { useDragWindow } from '../../hooks/use-drag-window.js';
import { useLorebook }   from '../../hooks/use-lorebook.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { MenuButton }    from './MenuButton.jsx';

export function WindowHeader() {
  const isMobile                           = useMobile();
  const { onPointerDown }                  = useDragWindow();
  const { activeLorebook, renameLorebook } = useLorebook();

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

      {/* Menu button — opens slide tray on both desktop and mobile */}
      <MenuButton />

      {/* Close — no-op in browser; hidden on mobile */}
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

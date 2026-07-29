// Window title bar — logo, lorebook name (desktop only), menu button, close button
import { useRef, useState } from 'react';
import { useDragWindow } from '../../hooks/use-drag-window.js';
import { useLorebook }   from '../../hooks/use-lorebook.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { useUi }                from '../../hooks/use-ui.js';
import { useSettings }          from '../../hooks/use-settings.js';
import { MenuButton }           from './MenuButton.jsx';
import { StorageUsageRing }     from './StorageUsageRing.jsx';
import { TitleMenu }            from '../feature/TitleMenu.jsx';
import logoUrl from '../../assets/Sacabambaspis2.png';

export function WindowHeader() {
  const isMobile                           = useMobile();
  const { onPointerDown }                  = useDragWindow();
  const { activeLorebook, renameLorebook } = useLorebook();
  const { funnyFishEnabled }               = useSettings();
  const setShowLander                      = useUi((s) => s.setShowLander);
  const titleBtnRef                        = useRef(null);
  const [titleOpen, setTitleOpen]          = useState(false);
  const [titleAnchor, setTitleAnchor]      = useState(null);
  const [renaming, setRenaming]            = useState(false);

  function toggleTitleMenu() {
    if (titleOpen) {
      setTitleOpen(false);
      return;
    }
    setTitleAnchor(titleBtnRef.current?.getBoundingClientRect() ?? null);
    setTitleOpen(true);
  }

  // Double-click renames in place. The first of the two clicks has already
  // opened the menu, so close it on the way into the input — otherwise the
  // menu would sit over the field being typed into.
  function startRename() {
    setTitleOpen(false);
    setRenaming(true);
  }

  return (
    <div
      className="window-header"
      onPointerDown={isMobile ? undefined : onPointerDown}
    >
      {/* Logo */}
      <div className="header-logo" onPointerDown={(e) => e.stopPropagation()}>
        {funnyFishEnabled
          ? <img className="logo-icon" src={logoUrl} alt="" />
          : <span className="logo-icon">📖</span>
        }
        <span className="logo-text">LOREBOOK BUILDER</span>
      </div>

      {/* Lorebook title — desktop only; on mobile it lives in the build panel.
          The field is absolutely centred in the window (see CSS); the count
          lives in an aside anchored to its right edge so it never shifts the
          field off-centre. Click opens the dual-column menu, double-click
          renames in place. */}
      {!isMobile && (
        <div className="lorebook-name-sizer">
          {renaming ? (
            <input
              className="lorebook-name-input"
              value={activeLorebook?.name ?? ''}
              onChange={(e) => renameLorebook(e.target.value)}
              placeholder="Lorebook name…"
              size={Math.max(10, (activeLorebook?.name?.length ?? 0) + 2)}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setRenaming(false); }}
              autoFocus
              spellCheck={false}
            />
          ) : (
            <button
              ref={titleBtnRef}
              className={`title-field${titleOpen ? ' title-field--open' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleTitleMenu}
              onDoubleClick={startRename}
              title="Lorebooks, import and export — double-click to rename"
              aria-haspopup="dialog"
              aria-expanded={titleOpen}
            >
              <span className="title-field-name">
                {activeLorebook?.name || 'Untitled lorebook'}
              </span>
              <span className="title-field-caret" aria-hidden="true">▾</span>
            </button>
          )}
          {titleOpen && (
            <TitleMenu
              anchorRect={titleAnchor}
              onClose={() => setTitleOpen(false)}
            />
          )}
        </div>
      )}

      {/* Right-side controls — pushed to the right edge; the centred name floats
          over the gap between the logo and these. */}
      <div className="header-right">
        {/* The storage ring lives in the status footer on desktop. Mobile has no
            footer, so it stays in the header there. */}
        {isMobile && <StorageUsageRing />}

        {/* Gear → Settings, or the legacy ☰ menu if the user turned it back on */}
        <MenuButton />

        {/* Close — returns to lander; hidden on mobile */}
        {!isMobile && (
          <button
            className="header-close"
            title="Return to home"
            aria-label="Return to home"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowLander(true)}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

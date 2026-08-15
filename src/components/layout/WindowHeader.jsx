// Window title bar — logo, lorebook name (desktop only), menu button, close button
import { useRef, useState, useEffect, useCallback } from 'react';
import { useDragWindow } from '../../hooks/use-drag-window.js';
import { useLorebook }   from '../../hooks/use-lorebook.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { useUi }                from '../../hooks/use-ui.js';
import { useSettings }          from '../../hooks/use-settings.js';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { MenuButton }           from './MenuButton.jsx';
import { StorageUsageRing }     from './StorageUsageRing.jsx';
import { TitleMenu }            from '../feature/TitleMenu.jsx';
import { TITLE_MENU_OPEN_MS, TITLE_MENU_CLOSE_MS } from '../../constants/title-menu.js';
import logoUrl from '../../assets/Sacabambaspis2.png';

export function WindowHeader() {
  const isMobile                           = useMobile();
  const { onPointerDown }                  = useDragWindow();
  const { activeLorebook, renameLorebook } = useLorebook();
  const { funnyFishEnabled }               = useSettings();
  const { crosstalkEnabled }               = useReferenceLorebook();
  const setShowLander                      = useUi((s) => s.setShowLander);
  const openMobileTitleMenu                = useUi((s) => s.openMobileTitleMenu);
  const [renaming, setRenaming] = useState(false);

  // Hover surfaces the menu, moving away dismisses it, a click pins it until
  // clicked again — the same two-state behaviour as the footer's Size button.
  const [titleOpen, setTitleOpen]     = useState(false);
  const [pinned, setPinned]           = useState(false);
  const [titleAnchor, setTitleAnchor] = useState(null);

  const titleBtnRef = useRef(null);
  const openTimer   = useRef(null);
  const closeTimer  = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  const closeTitleMenu = useCallback(() => {
    clearTimers();
    setTitleOpen(false);
    setPinned(false);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  const openTitleMenu = useCallback(() => {
    setTitleAnchor(titleBtnRef.current?.getBoundingClientRect() ?? null);
    setTitleOpen(true);
  }, []);

  function hoverOpen() {
    clearTimeout(closeTimer.current);
    if (titleOpen) return;
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(openTitleMenu, TITLE_MENU_OPEN_MS);
  }

  // A pinned menu ignores the pointer leaving — that is the whole point of the
  // pin. The delay covers the gap between the field and the menu below it.
  function hoverClose() {
    clearTimeout(openTimer.current);
    if (pinned) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setTitleOpen(false), TITLE_MENU_CLOSE_MS);
  }

  function handleTitleClick() {
    clearTimers();
    if (pinned) {
      setPinned(false);
      setTitleOpen(false);
      return;
    }
    setPinned(true);
    if (!titleOpen) openTitleMenu();
  }

  // The menu is portaled to document.body, so an outside-click test that only
  // knew about the header would fire the moment the pointer entered the menu.
  // Excluding the field itself is what lets a second click close the menu —
  // without it, mousedown closes and the click that follows reopens.
  useEffect(() => {
    if (!titleOpen) return undefined;
    function onMouseDown(e) {
      if (titleBtnRef.current?.contains(e.target)) return;
      if (e.target.closest?.('.title-menu')) return;
      closeTitleMenu();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [titleOpen, closeTitleMenu]);

  // Positioned from a rect captured at open time, so it would drift if the
  // window moved or resized underneath it. Cheaper to close than to re-measure.
  useEffect(() => {
    if (!titleOpen) return undefined;
    window.addEventListener('resize', closeTitleMenu);
    return () => window.removeEventListener('resize', closeTitleMenu);
  }, [titleOpen, closeTitleMenu]);

  // Double-click renames in place. The first of the two clicks has already
  // opened and pinned the menu, so tear all of that down on the way into the
  // input — otherwise the menu would sit over the field being typed into.
  function startRename() {
    closeTitleMenu();
    setRenaming(true);
  }

  return (
    <div
      className="window-header"
      onPointerDown={isMobile ? undefined : onPointerDown}
    >
      {/* Logo. The wordmark is desktop-only: at 360px it is 211px of the
          screen with 55px of dead space beside it, and the title has to live
          somewhere. The mark alone still identifies the app, and a phone user
          knows which app they opened. */}
      <div className="header-logo" onPointerDown={(e) => e.stopPropagation()}>
        {funnyFishEnabled
          ? <img className="logo-icon" src={logoUrl} alt="" />
          : <span className="logo-icon">📖</span>
        }
        {!isMobile && <span className="logo-text">LOREBOOK BUILDER</span>}
      </div>

      {/* Mobile title — the same control desktop has, in the same place.
          Before 14C this lived in its own 44px bar below the filter stack, which
          is both a row of chrome and the wrong order: you met the filters before
          you met the book they filter.

          Only in the solo pose. Once a reference is paired there are two books
          and the role bar below shows both; a header can hold one title, and
          putting the active one here as well would say it twice. */}
      {isMobile && !crosstalkEnabled && (
        <button
          ref={titleBtnRef}
          className={`title-field title-field--mobile${titleOpen ? ' title-field--open' : ''}`}
          onClick={() => openMobileTitleMenu()}
          aria-haspopup="dialog"
          title="Lorebooks, import and export"
        >
          <span className="title-field-name">
            {activeLorebook?.name || 'Untitled lorebook'}
          </span>
          <span className="title-field-caret" aria-hidden="true">▾</span>
        </button>
      )}

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
              className={`title-field${titleOpen ? ' title-field--open' : ''}${pinned ? ' title-field--pinned' : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleTitleClick}
              onDoubleClick={startRename}
              onMouseEnter={hoverOpen}
              onMouseLeave={hoverClose}
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
              onClose={closeTitleMenu}
              onMouseEnter={() => clearTimeout(closeTimer.current)}
              onMouseLeave={hoverClose}
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

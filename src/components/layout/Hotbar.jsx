// Unified hotbar — 3 configurable slots, pinned + FAB, 3 configurable slots; renders on both platforms
import { useState, useRef } from 'react';
import { useHotbarActions } from '../../hooks/use-hotbar-actions.js';
import { useUi }            from '../../hooks/use-ui.js';
import { useMobile }        from '../../hooks/use-mobile.js';
import { useSettings }      from '../../hooks/use-settings.js';
import { FabQuickMenu }     from '../feature/FabQuickMenu.jsx';
import { THESAURUS_LONG_PRESS_MS } from '../../constants/limits.js';

const FAB_SIZES = { small: 44, medium: 54, large: 64 };

// Hover delays for the FAB quick menu — slightly longer than the suggestion
// chips so a casual mouse-over doesn't unfurl the menu when the user only
// meant to click Add Entry.
const HOVER_OPEN_MS  = 200;
const HOVER_CLOSE_MS = 200;

function HotbarSlot({ action }) {
  if (!action) {
    return <div className="hotbar-slot hotbar-slot--empty" aria-hidden="true" />;
  }

  const { descriptor, execute, disabled, active } = action;

  function handleClick() {
    if (descriptor.confirm) {
      if (!window.confirm(descriptor.confirm)) return;
    }
    execute();
  }

  // A boolean `active` (true OR false) marks this as a stateful toggle, so it
  // gets the track-outline treatment when off and the filled blue when on.
  // `active === undefined` means it's a one-shot command and stays neutral.
  const isToggle = typeof active === 'boolean';

  return (
    <button
      className={`footer-btn${isToggle ? ' footer-btn--toggle' : ''}${active ? ' footer-btn--active' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      title={descriptor.title}
    >
      <span className="hotbar-slot-icon">{descriptor.icon} </span>
      <span className="hotbar-slot-text">{descriptor.label}</span>
    </button>
  );
}

export function Hotbar() {
  const { slots, addEntry, allActions } = useHotbarActions();
  const isMobile                        = useMobile();
  const activeMenuPanel                 = useUi((s) => s.activeMenuPanel);
  const { fabSize, fabCustomSize, fabQuickMenuEnabled } = useSettings();

  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const openTimerRef         = useRef(null);
  const closeTimerRef        = useRef(null);
  const longPressTimerRef    = useRef(null);
  const suppressNextClickRef = useRef(false);

  const leftSlots  = slots.slice(0, 3);
  const rightSlots = slots.slice(3, 6);

  const fabPx       = fabSize === 'custom' ? fabCustomSize : (FAB_SIZES[fabSize] ?? 64);
  const fabFontSize = `${Math.round(fabPx * 0.45)}px`;
  const fabHidden   = isMobile && activeMenuPanel;

  const fabStyle = {
    width:    fabPx,
    height:   fabPx,
    fontSize: fabFontSize,
    ...(fabHidden ? { display: 'none' } : {}),
  };

  function clearTimers() {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
    clearTimeout(longPressTimerRef.current);
  }

  // Desktop hover
  function onFabMouseEnter() {
    if (isMobile || !fabQuickMenuEnabled) return;
    clearTimeout(closeTimerRef.current);
    clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => setQuickMenuOpen(true), HOVER_OPEN_MS);
  }
  function onFabMouseLeave() {
    if (isMobile || !fabQuickMenuEnabled) return;
    clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => setQuickMenuOpen(false), HOVER_CLOSE_MS);
  }
  function onMenuMouseEnter() {
    if (isMobile) return;
    clearTimeout(closeTimerRef.current);
  }
  function onMenuMouseLeave() {
    if (isMobile) return;
    closeTimerRef.current = setTimeout(() => setQuickMenuOpen(false), HOVER_CLOSE_MS);
  }

  // Mobile long-press: opens the menu and suppresses the click that fires on
  // touch release (which would otherwise add an entry).
  function onFabPointerDown() {
    if (!isMobile || !fabQuickMenuEnabled) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      suppressNextClickRef.current = true;
      setQuickMenuOpen(true);
      // Self-heal: some mobile browsers swallow the click after a long-press
      // (context menu wins). Auto-clear so a later legitimate click isn't lost.
      setTimeout(() => { suppressNextClickRef.current = false; }, 600);
    }, THESAURUS_LONG_PRESS_MS);
  }
  function onFabPointerUp() {
    if (!isMobile) return;
    clearTimeout(longPressTimerRef.current);
  }

  function onFabClick() {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    addEntry();
  }

  function closeMenu() {
    clearTimers();
    setQuickMenuOpen(false);
  }

  return (
    <div className="hotbar">
      <div className="hotbar-group">
        {leftSlots.map((action, i) => (
          <HotbarSlot key={`left-${i}`} action={action} />
        ))}
      </div>

      <div className="footer-fab-wrap">
        <button
          className="footer-fab"
          onClick={onFabClick}
          onMouseEnter={onFabMouseEnter}
          onMouseLeave={onFabMouseLeave}
          onPointerDown={onFabPointerDown}
          onPointerUp={onFabPointerUp}
          onPointerCancel={onFabPointerUp}
          onContextMenu={(e) => { if (isMobile && fabQuickMenuEnabled) e.preventDefault(); }}
          title="Add entry (Alt+N)"
          style={fabStyle}
        >
          +
        </button>

        {quickMenuOpen && !fabHidden && fabQuickMenuEnabled && (
          <FabQuickMenu
            actions={allActions}
            onAction={closeMenu}
            onClose={closeMenu}
            onMouseEnter={onMenuMouseEnter}
            onMouseLeave={onMenuMouseLeave}
          />
        )}
      </div>

      <div className="hotbar-group hotbar-group--right">
        {rightSlots.map((action, i) => (
          <HotbarSlot key={`right-${i}`} action={action} />
        ))}
      </div>
    </div>
  );
}

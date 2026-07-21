// Unified hotbar — 3 configurable slots, pinned + FAB, 3 configurable slots; renders on both platforms
import { useState, useRef, useEffect } from 'react';
import { useHotbarActions } from '../../hooks/use-hotbar-actions.js';
import { useKeybindings }   from '../../hooks/use-keybindings.js';
import { useUi }            from '../../hooks/use-ui.js';
import { useMobile }        from '../../hooks/use-mobile.js';
import { useSettings }      from '../../hooks/use-settings.js';
import { FabQuickMenu }     from '../feature/FabQuickMenu.jsx';
import { ExportMenu }       from '../feature/ExportMenu.jsx';
import { THESAURUS_LONG_PRESS_MS } from '../../constants/limits.js';

const FAB_SIZES = { small: 44, medium: 54, large: 64 };

// Hover delays for the FAB quick menu — slightly longer than the suggestion
// chips so a casual mouse-over doesn't unfurl the menu when the user only
// meant to click Add Entry.
const HOVER_OPEN_MS  = 200;
const HOVER_CLOSE_MS = 200;

function HotbarSlot({ action, pinMode = false, armed = false, slotIndex = null, onArm, chord = null }) {
  // While the "Add to hotbar" pin flow is active, every slot (filled or empty)
  // is an armable drop target — clicking arms it rather than running its action.
  if (pinMode) {
    const label = action ? action.descriptor.label : 'Empty';
    const icon  = action ? action.descriptor.icon : '+';
    return (
      <button
        className={`footer-btn hotbar-slot--target${armed ? ' hotbar-slot--armed' : ''}${action ? '' : ' hotbar-slot--empty-target'}`}
        onClick={() => onArm?.(slotIndex)}
        title={action ? `${label} — click to arm, then pick an action to replace it` : 'Empty slot — click to arm, then pick an action'}
      >
        <span className="hotbar-slot-icon">{icon} </span>
        <span className="hotbar-slot-text">{label}</span>
      </button>
    );
  }

  if (!action) {
    return <div className="hotbar-slot hotbar-slot--empty" aria-hidden="true" />;
  }

  const { descriptor, execute, disabled, active } = action;

  function handleClick(e) {
    if (descriptor.confirm) {
      if (!window.confirm(descriptor.confirm)) return;
    }
    execute(e);
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
      title={chord ? `${descriptor.title} (${chord})` : descriptor.title}
    >
      <span className="hotbar-slot-icon">{descriptor.icon} </span>
      <span className="hotbar-slot-text">{descriptor.label}</span>
    </button>
  );
}

export function Hotbar() {
  const { slots, addEntry, allActions } = useHotbarActions();
  const { displayChord }                = useKeybindings();
  const isMobile                        = useMobile();
  const activeMenuPanel                 = useUi((s) => s.activeMenuPanel);

  // Live chord hint for the two hotbar actions that have a keyboard binding.
  const slotChord = (id) => (id === 'undo' || id === 'redo') ? displayChord(id) : null;
  const { fabSize, fabCustomSize, fabQuickMenuEnabled, hotbarSlots, setHotbarSlots } = useSettings();

  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  // "Add to hotbar" pin flow: while active, the real hotbar slots become
  // armable drop targets and the menu stays open regardless of hover.
  const [pinMode,   setPinMode]   = useState(false);
  const [armedSlot, setArmedSlot] = useState(null);
  const [barWidth,  setBarWidth]  = useState(0);
  const hotbarRef            = useRef(null);
  const openTimerRef         = useRef(null);
  const closeTimerRef        = useRef(null);
  const longPressTimerRef    = useRef(null);
  const suppressNextClickRef = useRef(false);

  // Track the hotbar's width so the quick-menu caps itself to the window (not
  // the viewport) and wraps its chips to 2–3 rows on narrow windows.
  useEffect(() => {
    const el = hotbarRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => setBarWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    if (pinMode) return;
    closeTimerRef.current = setTimeout(() => setQuickMenuOpen(false), HOVER_CLOSE_MS);
  }
  function onMenuMouseEnter() {
    if (isMobile) return;
    clearTimeout(closeTimerRef.current);
  }
  function onMenuMouseLeave() {
    if (isMobile) return;
    if (pinMode) return;
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

  function enterPin() { setPinMode(true); setArmedSlot(null); }
  function exitPin()  { setPinMode(false); setArmedSlot(null); }

  function assignToArmed(actionId) {
    if (armedSlot == null) return;
    const next = [...hotbarSlots];
    next[armedSlot] = actionId;
    setHotbarSlots(next);
    setArmedSlot(null); // ready to arm the next slot
  }

  function closeMenu() {
    clearTimers();
    setQuickMenuOpen(false);
    setPinMode(false);
    setArmedSlot(null);
  }

  return (
    <div className="hotbar" ref={hotbarRef}>
      <div className="hotbar-group">
        {leftSlots.map((action, i) => (
          <HotbarSlot key={`left-${i}`} action={action} slotIndex={i} pinMode={pinMode} armed={armedSlot === i} onArm={setArmedSlot} chord={action ? slotChord(action.descriptor.id) : null} />
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
          title={`Add entry (${displayChord('new_entry')})`}
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
            menuMaxWidth={barWidth ? Math.max(180, barWidth - 24) : undefined}
            pinMode={pinMode}
            armedSlot={armedSlot}
            onEnterPin={enterPin}
            onExitPin={exitPin}
            onAssign={assignToArmed}
          />
        )}
      </div>

      <div className="hotbar-group hotbar-group--right">
        {rightSlots.map((action, i) => (
          <HotbarSlot key={`right-${i}`} action={action} slotIndex={i + 3} pinMode={pinMode} armed={armedSlot === i + 3} onArm={setArmedSlot} chord={action ? slotChord(action.descriptor.id) : null} />
        ))}
      </div>

      <ExportMenu />
    </div>
  );
}

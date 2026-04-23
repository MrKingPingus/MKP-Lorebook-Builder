// Window title bar — logo, lorebook name (desktop only), menu button, close button
import { useRef, useState } from 'react';
import { useDragWindow } from '../../hooks/use-drag-window.js';
import { useLorebook }   from '../../hooks/use-lorebook.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { useUi }         from '../../hooks/use-ui.js';
import { CROSSTALK_ENABLED } from '../../constants/crosstalk.js';
import { MenuButton }    from './MenuButton.jsx';
import { HiddenEntriesPopover }   from '../feature/HiddenEntriesPopover.jsx';
import { LorebookSwitchPopover }  from '../feature/LorebookSwitchPopover.jsx';

export function WindowHeader() {
  const isMobile                           = useMobile();
  const { onPointerDown }                  = useDragWindow();
  const { activeLorebook, renameLorebook } = useLorebook();
  const setShowLander                      = useUi((s) => s.setShowLander);
  const hiddenBtnRef                       = useRef(null);
  const [hiddenOpen, setHiddenOpen]        = useState(false);
  const [hiddenAnchor, setHiddenAnchor]    = useState(null);
  const switchBtnRef                       = useRef(null);
  const [switchOpen, setSwitchOpen]        = useState(false);
  const [switchAnchor, setSwitchAnchor]    = useState(null);

  const hiddenEntries = activeLorebook?.entries.filter((e) => e.hiddenFromExport) ?? [];
  // Only surface the switch affordance in solo mode on desktop — crosstalk
  // has per-pane pickers and mobile routes switching through the menu panel.
  const showSwitchButton = !CROSSTALK_ENABLED && !isMobile;

  function toggleHidden() {
    if (hiddenOpen) {
      setHiddenOpen(false);
      return;
    }
    setHiddenAnchor(hiddenBtnRef.current?.getBoundingClientRect() ?? null);
    setHiddenOpen(true);
  }

  function toggleSwitch() {
    if (switchOpen) {
      setSwitchOpen(false);
      return;
    }
    setSwitchAnchor(switchBtnRef.current?.getBoundingClientRect() ?? null);
    setSwitchOpen(true);
  }

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

      {/* Lorebook name — desktop only; on mobile it lives in the build panel */}
      {!isMobile && (
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
          {showSwitchButton && (
            <button
              ref={switchBtnRef}
              className="lorebook-switch-btn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleSwitch}
              title="Switch to another lorebook"
              aria-label="Switch lorebook"
            >
              ▼
            </button>
          )}
          {switchOpen && (
            <LorebookSwitchPopover
              anchorRect={switchAnchor}
              onClose={() => setSwitchOpen(false)}
            />
          )}
          {activeLorebook && (
            <span className="lorebook-entry-count" title="Total entries in this lorebook">
              · {activeLorebook.entries.length} {activeLorebook.entries.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
          {activeLorebook && hiddenEntries.length > 0 && (
            <button
              ref={hiddenBtnRef}
              className="lorebook-hidden-count"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleHidden}
              title="Entries excluded from JSON export — click to view and manage"
            >
              · {hiddenEntries.length} hidden
            </button>
          )}
          {hiddenOpen && (
            <HiddenEntriesPopover
              anchorRect={hiddenAnchor}
              hiddenEntries={hiddenEntries}
              onClose={() => setHiddenOpen(false)}
            />
          )}
        </div>
      )}

      {/* Menu button — opens slide tray on both desktop and mobile */}
      <MenuButton />

      {/* Close — returns to lander; hidden on mobile */}
      {!isMobile && (
        <button
          className="header-close"
          title="Return to home"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setShowLander(true)}
        >
          ×
        </button>
      )}
    </div>
  );
}

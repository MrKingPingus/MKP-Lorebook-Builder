// Window title bar — logo, lorebook name (desktop only), menu button, close button
import { useRef, useState } from 'react';
import { useDragWindow } from '../../hooks/use-drag-window.js';
import { useLorebook }   from '../../hooks/use-lorebook.js';
import { useMobile }     from '../../hooks/use-mobile.js';
import { useUi }                from '../../hooks/use-ui.js';
import { useReferenceLorebook } from '../../hooks/use-reference-lorebook.js';
import { useSettings }          from '../../hooks/use-settings.js';
import { MenuButton }           from './MenuButton.jsx';
import { StorageUsageRing }     from './StorageUsageRing.jsx';
import { FeedbackLinks }        from './FeedbackLinks.jsx';
import { HiddenEntriesPopover }   from '../feature/HiddenEntriesPopover.jsx';
import { LorebookSwitchPopover }  from '../feature/LorebookSwitchPopover.jsx';
import logoUrl from '../../assets/Sacabambaspis2.png';

export function WindowHeader() {
  const isMobile                           = useMobile();
  const { onPointerDown }                  = useDragWindow();
  const { activeLorebook, renameLorebook } = useLorebook();
  const { crosstalkEnabled }               = useReferenceLorebook();
  const { funnyFishEnabled }               = useSettings();
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
  const showSwitchButton = !crosstalkEnabled && !isMobile;

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
        {funnyFishEnabled
          ? <img className="logo-icon" src={logoUrl} alt="" />
          : <span className="logo-icon">📖</span>
        }
        <span className="logo-text">LOREBOOK BUILDER</span>
      </div>

      {/* Lorebook name — desktop only; on mobile it lives in the build panel.
          The input is absolutely centred in the window (see CSS); the count and
          switch live in an aside anchored to the input's right edge so they
          never shift the input off-centre. */}
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
          <span className="lorebook-name-aside">
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
            {showSwitchButton && (
              <button
                ref={switchBtnRef}
                className="lorebook-switch-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleSwitch}
                title="Switch to another lorebook"
                aria-label="Switch lorebook"
              >
                Switch ▾
              </button>
            )}
          </span>
          {switchOpen && (
            <LorebookSwitchPopover
              anchorRect={switchAnchor}
              onClose={() => setSwitchOpen(false)}
            />
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

      {/* Right-side controls — pushed to the right edge; the centred name floats
          over the gap between the logo and these. */}
      <div className="header-right">
        {/* Feedback links (desktop only) — bug report + feature request */}
        {!isMobile && <FeedbackLinks />}

        {/* Storage usage ring */}
        <StorageUsageRing />

        {/* Menu button — opens slide tray on both desktop and mobile */}
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

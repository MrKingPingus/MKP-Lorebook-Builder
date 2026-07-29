// Thin always-visible status bar below the hotbar (desktop only).
//
// The division of labour with the hotbar is deliberate and is the rule for
// where any future control goes: the hotbar holds verbs on content (add, undo,
// export), this bar holds app state and view controls. Nothing here changes a
// lorebook.
//
// 13C moved the storage ring, feedback links and entry counts down here from
// the window header, which left the header as logo | title | gear | close.
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSaveStatus }   from '../../hooks/use-save-status.js';
import { useLorebook }     from '../../hooks/use-lorebook.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { ScaleMenu }            from '../feature/ScaleMenu.jsx';
import { HiddenEntriesPopover } from '../feature/HiddenEntriesPopover.jsx';
import { StorageUsageRing }     from './StorageUsageRing.jsx';
import { FeedbackLinks }        from './FeedbackLinks.jsx';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { SCALE_MENU_OPEN_MS, SCALE_MENU_CLOSE_MS } from '../../constants/scaling.js';

export function StatusFooter() {
  const { label, title, fresh } = useSaveStatus();
  const { activeLorebook }      = useLorebook();

  const hiddenBtnRef                    = useRef(null);
  const [hiddenOpen, setHiddenOpen]     = useState(false);
  const [hiddenAnchor, setHiddenAnchor] = useState(null);
  const hiddenEntries = activeLorebook?.entries.filter((e) => e.hiddenFromExport) ?? [];

  function toggleHidden() {
    if (hiddenOpen) {
      setHiddenOpen(false);
      return;
    }
    setHiddenAnchor(hiddenBtnRef.current?.getBoundingClientRect() ?? null);
    setHiddenOpen(true);
  }

  // Two independent states, FabFilter-style: hovering surfaces the menu and
  // moving away dismisses it, but a click pins it open until clicked again.
  const [scaleOpen, setScaleOpen]   = useState(false);
  const [pinned, setPinned]         = useState(false);
  const [anchorRect, setAnchorRect] = useState(null);

  const scaleBtnRef = useRef(null);
  const openTimer   = useRef(null);
  const closeTimer  = useRef(null);

  const clearTimers = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  const close = useCallback(() => {
    clearTimers();
    setScaleOpen(false);
    setPinned(false);
  }, [clearTimers]);

  useDismissLayer('footer:scale-menu', scaleOpen, DISMISS_PRIORITY.popover, close);

  useEffect(() => clearTimers, [clearTimers]);

  const open = useCallback(() => {
    setAnchorRect(scaleBtnRef.current?.getBoundingClientRect() ?? null);
    setScaleOpen(true);
  }, []);

  function hoverOpen() {
    clearTimeout(closeTimer.current);
    if (scaleOpen) return;
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(open, SCALE_MENU_OPEN_MS);
  }

  // A pinned menu ignores the pointer leaving — that is the whole point of the
  // pin. The delay covers the gap between the button and the menu above it.
  function hoverClose() {
    clearTimeout(openTimer.current);
    if (pinned) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setScaleOpen(false), SCALE_MENU_CLOSE_MS);
  }

  function handleClick() {
    clearTimers();
    if (pinned) {
      setPinned(false);
      setScaleOpen(false);
      return;
    }
    setPinned(true);
    if (!scaleOpen) open();
  }

  // The menu and its flyouts are portalled to document.body (they have to
  // escape .floating-window's overflow:hidden to open rightward), so an
  // outside-click test against the footer alone would close the menu the
  // instant the pointer entered it. Check the portalled roots too.
  useEffect(() => {
    if (!scaleOpen) return undefined;
    function onMouseDown(e) {
      if (scaleBtnRef.current?.contains(e.target)) return;
      if (e.target.closest?.('.scale-menu, .scale-flyout')) return;
      close();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [scaleOpen, close]);

  // A portalled menu is positioned from a rect captured at open time, so it
  // would drift if the window moved or resized underneath it. Cheaper and
  // steadier to close it than to re-measure on every frame of a drag.
  useEffect(() => {
    if (!scaleOpen) return undefined;
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [scaleOpen, close]);

  return (
    <div className="status-footer">
      <div className="status-left">
        <span className={`status-save${fresh ? ' status-save--fresh' : ''}`} title={title}>
          <span className="status-save-dot" aria-hidden="true" />
          {label}
        </span>

        {activeLorebook && (
          <span className="status-count" title="Total entries in this lorebook">
            {activeLorebook.entries.length} {activeLorebook.entries.length === 1 ? 'entry' : 'entries'}
          </span>
        )}

        {hiddenEntries.length > 0 && (
          <button
            ref={hiddenBtnRef}
            type="button"
            className="status-count status-count--btn"
            onClick={toggleHidden}
            title="Entries excluded from JSON export — click to view and manage"
          >
            {hiddenEntries.length} hidden
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

      <div className="status-right">
        <FeedbackLinks />
        <span className="status-divider" aria-hidden="true" />
        <StorageUsageRing />
        <span className="status-divider" aria-hidden="true" />
        <button
          ref={scaleBtnRef}
          type="button"
          className={`status-item${scaleOpen ? ' status-item--open' : ''}${pinned ? ' status-item--pinned' : ''}`}
          onClick={handleClick}
          onMouseEnter={hoverOpen}
          onMouseLeave={hoverClose}
          title={pinned ? 'Sizing & scale — click to unpin' : 'Sizing & scale — click to keep open'}
          aria-label="Sizing and scale"
          aria-haspopup="menu"
          aria-expanded={scaleOpen}
        >
          <span className="status-item-icon" aria-hidden="true">⤢</span>
          Size
        </button>

        {scaleOpen && (
          <ScaleMenu
            anchorRect={anchorRect}
            onMouseEnter={() => clearTimeout(closeTimer.current)}
            onMouseLeave={hoverClose}
          />
        )}
      </div>
    </div>
  );
}

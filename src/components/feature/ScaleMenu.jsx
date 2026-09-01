// The footer's sizing menu — Pro-Q's bottom-right scaling control.
//
// Four rows, each with a flyout: window size, text size, entry height, FAB
// size. Every row shows its current value inline so the closed menu doubles as
// a readout.
//
// Menu and flyouts are portalled to document.body and positioned `fixed` from
// their anchor's rect, the same way ExportMenu already
// escape the window. That matters here: .floating-window sets overflow:hidden,
// so an in-window flyout could only open LEFT (back over the menu) without
// being clipped. Portalled, flyouts open RIGHT into the page and flip left only
// when the viewport genuinely has no room.
import { useState, useRef, useEffect } from 'react';
import { createPortal }   from 'react-dom';
import { Flyout }         from '../ui/Flyout.jsx';
import { useSettings }    from '../../hooks/use-settings.js';
import { useWindowScale } from '../../hooks/use-window-scale.js';
import { UI_SCALE_STEPS, DEFAULT_UI_SCALE } from '../../constants/accessibility.js';
import {
  FAB_SIZE_OPTIONS,
  FAB_CUSTOM_MIN,
  FAB_CUSTOM_MAX,
  ENTRY_HEADER_SIZE_OPTIONS,
  WINDOW_SIZE_PRESETS,
  FLYOUT_OPEN_MS,
  FLYOUT_CLOSE_MS,
  FLYOUT_GAP_PX,
  FLYOUT_VIEWPORT_PAD,
} from '../../constants/scaling.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../../constants/limits.js';

/**
 * A number field that keeps its own draft while focused and only commits on
 * blur or Enter.
 *
 * A controlled input bound straight to the clamped value is unusable: typing
 * the first digit of "1200" into a field showing "480" produces 1, which
 * clamps back to 480 before the second digit arrives, so the field snaps to a
 * bound on every keystroke and the value can never be typed.
 */
function CommitNumberInput({ value, min, max, onCommit, ariaLabel }) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);

  // Track external changes (a preset click) unless the user is mid-edit.
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  function commit() {
    setEditing(false);
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || draft.trim() === '') {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Math.round(parsed)));
    setDraft(String(clamped));
    onCommit(clamped);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      aria-label={ariaLabel}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(e) => { setEditing(true); setDraft(e.target.value); }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter')  { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); setEditing(false); setDraft(String(value)); e.currentTarget.blur(); }
      }}
    />
  );
}

function ScaleRow({ id, label, value, openRow, onHoverRow, onLeaveRow, onToggleRow, onMenuEnter, onMenuLeave, children }) {
  const open = openRow === id;
  const rowRef = useRef(null);

  return (
    <div
      ref={rowRef}
      className={`scale-row${open ? ' scale-row--open' : ''}`}
      role="menuitem"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={open}
      onMouseEnter={() => onHoverRow(id)}
      onMouseLeave={onLeaveRow}
      onFocus={() => onHoverRow(id, true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleRow(id);
        }
      }}
    >
      <span className="scale-row-label">{label}</span>
      <span className="scale-row-value">{value}</span>
      <span className="scale-row-arrow" aria-hidden="true">▶</span>
      {open && (
        <Flyout
          className="scale-flyout"
          anchorEl={rowRef.current}
          onMouseEnter={() => { onHoverRow(id, true); onMenuEnter?.(); }}
          onMouseLeave={(e) => { onLeaveRow(); onMenuLeave?.(e); }}
        >
          {children}
        </Flyout>
      )}
    </div>
  );
}

function FlyoutItem({ checked, detail, onClick, children }) {
  return (
    <button
      type="button"
      className="flyout-item"
      role="menuitemradio"
      aria-checked={!!checked}
      onClick={onClick}
    >
      <span className="flyout-check" aria-hidden="true">{checked ? '✓' : ''}</span>
      <span className="flyout-item-label">{children}</span>
      {detail && <span className="flyout-item-detail">{detail}</span>}
    </button>
  );
}

export function ScaleMenu({ anchorRect, onMouseEnter, onMouseLeave }) {
  const [openRow, setOpenRow]       = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const openTimer  = useRef(null);
  const closeTimer = useRef(null);

  const {
    uiScale, setUiScale,
    entryHeaderSize, setEntryHeaderSize,
    fabSize, setFabSize,
    fabCustomSize, setFabCustomSize,
  } = useSettings();

  const {
    windowSize, activePresetId, applySize, applyPreset,
    resetWindow, saveCurrentAsDefault,
  } = useWindowScale();

  useEffect(() => () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  // Hover grace. Opening is delayed so a pointer travelling diagonally across
  // the menu doesn't unfurl every row it crosses; closing is delayed longer so
  // the gap between a row and its flyout doesn't drop it mid-reach.
  function hoverRow(id, immediate = false) {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    if (immediate || openRow !== null) {
      // Once a flyout is already showing, moving between rows should track the
      // pointer without a second delay.
      setOpenRow(id);
      return;
    }
    openTimer.current = setTimeout(() => setOpenRow(id), FLYOUT_OPEN_MS);
  }

  function leaveRow() {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenRow(null), FLYOUT_CLOSE_MS);
  }

  function toggleRow(id) {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    setOpenRow((cur) => (cur === id ? null : id));
  }

  const scaleLabel  = UI_SCALE_STEPS.find((s) => s.value === uiScale)?.label ?? `${Math.round(uiScale * 100)}%`;
  const headerLabel = ENTRY_HEADER_SIZE_OPTIONS.find((o) => o.value === entryHeaderSize)?.label ?? 'Default';
  const fabLabel    = fabSize === 'custom'
    ? `${fabCustomSize}px`
    : (FAB_SIZE_OPTIONS.find((o) => o.value === fabSize)?.label ?? 'Large');
  const windowLabel = activePresetId
    ? WINDOW_SIZE_PRESETS.find((p) => p.id === activePresetId).label
    : `${windowSize.width}×${windowSize.height}`;

  // Deliberately does NOT touch text size. That is an accessibility setting a
  // user may depend on, and wiping it from a general "reset sizing" would be
  // hostile in a way the other three resets are not.
  function resetAllSizing() {
    resetWindow();
    setEntryHeaderSize('default');
    setFabSize('large');
    setOpenRow(null);
  }

  const rowProps = {
    openRow,
    onHoverRow: hoverRow,
    onLeaveRow: leaveRow,
    onToggleRow: toggleRow,
    onMenuEnter: onMouseEnter,
    onMenuLeave: onMouseLeave,
  };

  return createPortal(
    <div
      className="scale-menu"
      role="menu"
      aria-label="Sizing and scale"
      style={anchorRect ? {
        position: 'fixed',
        bottom: window.innerHeight - anchorRect.top + FLYOUT_GAP_PX,
        right:  Math.max(FLYOUT_VIEWPORT_PAD, window.innerWidth - anchorRect.right),
      } : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={(e) => { leaveRow(); onMouseLeave?.(e); }}
    >
      <div className="scale-menu-head">Sizing &amp; scale</div>

      <ScaleRow id="window" label="Window size" value={windowLabel} {...rowProps}>
        {WINDOW_SIZE_PRESETS.map((preset) => (
          <FlyoutItem
            key={preset.id}
            checked={activePresetId === preset.id}
            detail={preset.width ? `${preset.width}×${preset.height}` : null}
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </FlyoutItem>
        ))}

        <div className="scale-menu-divider" />

        <button
          type="button"
          className="flyout-item"
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((v) => !v)}
        >
          <span className="flyout-check" aria-hidden="true">{customOpen ? '▾' : '▸'}</span>
          <span className="flyout-item-label">Custom…</span>
        </button>

        {customOpen && (
          <div className="flyout-custom">
            <label className="flyout-custom-field">
              <span>W</span>
              <CommitNumberInput
                ariaLabel="Window width"
                value={windowSize.width}
                min={MIN_WINDOW_WIDTH}
                onCommit={(w) => applySize(w, windowSize.height)}
              />
            </label>
            <label className="flyout-custom-field">
              <span>H</span>
              <CommitNumberInput
                ariaLabel="Window height"
                value={windowSize.height}
                min={MIN_WINDOW_HEIGHT}
                onCommit={(h) => applySize(windowSize.width, h)}
              />
            </label>
          </div>
        )}

        <button type="button" className="flyout-item flyout-item--action" onClick={saveCurrentAsDefault}>
          <span className="flyout-check" aria-hidden="true" />
          <span className="flyout-item-label">Save as default</span>
        </button>
        <button type="button" className="flyout-item flyout-item--action" onClick={resetWindow}>
          <span className="flyout-check" aria-hidden="true" />
          <span className="flyout-item-label">Reset to default</span>
        </button>
      </ScaleRow>

      <ScaleRow id="text" label="Text size" value={scaleLabel} {...rowProps}>
        {UI_SCALE_STEPS.map((step) => (
          <FlyoutItem
            key={step.value}
            checked={uiScale === step.value}
            detail={step.value === DEFAULT_UI_SCALE ? 'Default' : null}
            onClick={() => setUiScale(step.value)}
          >
            {step.label}
          </FlyoutItem>
        ))}
      </ScaleRow>

      <ScaleRow id="header" label="Entry height" value={headerLabel} {...rowProps}>
        {ENTRY_HEADER_SIZE_OPTIONS.map((option) => (
          <FlyoutItem
            key={option.value}
            checked={entryHeaderSize === option.value}
            onClick={() => setEntryHeaderSize(option.value)}
          >
            {option.label}
          </FlyoutItem>
        ))}
      </ScaleRow>

      <ScaleRow id="fab" label="FAB button size" value={fabLabel} {...rowProps}>
        {FAB_SIZE_OPTIONS.map((option) => (
          <FlyoutItem
            key={option.value}
            checked={fabSize === option.value}
            detail={option.detail}
            onClick={() => setFabSize(option.value)}
          >
            {option.label}
          </FlyoutItem>
        ))}
        {fabSize === 'custom' && (
          <div className="flyout-custom">
            <label className="flyout-custom-field">
              <span>px</span>
              <CommitNumberInput
                ariaLabel="FAB size in pixels"
                value={fabCustomSize}
                min={FAB_CUSTOM_MIN}
                max={FAB_CUSTOM_MAX}
                onCommit={setFabCustomSize}
              />
            </label>
          </div>
        )}
      </ScaleRow>

      <div className="scale-menu-divider" />

      <button type="button" className="scale-row scale-row--reset" role="menuitem" onClick={resetAllSizing}>
        <span className="scale-row-label">Reset all sizing</span>
        <span className="scale-row-note">Text size kept</span>
      </button>
    </div>,
    document.body,
  );
}

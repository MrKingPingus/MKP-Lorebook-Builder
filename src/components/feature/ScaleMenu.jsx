// The footer's sizing menu — Pro-Q's bottom-right scaling control.
//
// Four rows, each with a flyout: window size, text size, entry header height,
// FAB size. Every row shows its current value inline so the closed menu doubles
// as a readout. Flyouts open to the LEFT because the trigger sits at the
// window's right edge and the window can be as narrow as 480px.
import { useState } from 'react';
import { useSettings }    from '../../hooks/use-settings.js';
import { useWindowScale } from '../../hooks/use-window-scale.js';
import { UI_SCALE_STEPS, DEFAULT_UI_SCALE } from '../../constants/accessibility.js';
import {
  FAB_SIZE_OPTIONS,
  FAB_CUSTOM_MIN,
  FAB_CUSTOM_MAX,
  ENTRY_HEADER_SIZE_OPTIONS,
  WINDOW_SIZE_PRESETS,
} from '../../constants/scaling.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../../constants/limits.js';

function ScaleRow({ id, label, value, openRow, setOpenRow, children }) {
  const open = openRow === id;
  return (
    <div
      className={`scale-row${open ? ' scale-row--open' : ''}`}
      role="menuitem"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={open}
      onMouseEnter={() => setOpenRow(id)}
      onFocus={() => setOpenRow(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpenRow(open ? null : id);
        }
      }}
    >
      <span className="scale-row-label">{label}</span>
      <span className="scale-row-value">{value}</span>
      <span className="scale-row-arrow" aria-hidden="true">◀</span>
      {open && <div className="scale-flyout" role="menu">{children}</div>}
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

export function ScaleMenu() {
  const [openRow, setOpenRow]       = useState(null);
  const [customOpen, setCustomOpen] = useState(false);

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

  return (
    <div
      className="scale-menu"
      role="menu"
      aria-label="Sizing and scale"
      onMouseLeave={() => setOpenRow(null)}
    >
      <div className="scale-menu-head">Sizing &amp; scale</div>

      <ScaleRow id="window" label="Window size" value={windowLabel} openRow={openRow} setOpenRow={setOpenRow}>
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
              <input
                type="number"
                min={MIN_WINDOW_WIDTH}
                value={windowSize.width}
                onChange={(e) => applySize(Number(e.target.value), windowSize.height)}
              />
            </label>
            <label className="flyout-custom-field">
              <span>H</span>
              <input
                type="number"
                min={MIN_WINDOW_HEIGHT}
                value={windowSize.height}
                onChange={(e) => applySize(windowSize.width, Number(e.target.value))}
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

      <ScaleRow id="text" label="Text size" value={scaleLabel} openRow={openRow} setOpenRow={setOpenRow}>
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

      <ScaleRow id="header" label="Entry header" value={headerLabel} openRow={openRow} setOpenRow={setOpenRow}>
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

      <ScaleRow id="fab" label="FAB button size" value={fabLabel} openRow={openRow} setOpenRow={setOpenRow}>
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
              <input
                type="number"
                min={FAB_CUSTOM_MIN}
                max={FAB_CUSTOM_MAX}
                value={fabCustomSize}
                onChange={(e) => setFabCustomSize(
                  Math.min(FAB_CUSTOM_MAX, Math.max(FAB_CUSTOM_MIN, Number(e.target.value))),
                )}
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
    </div>
  );
}

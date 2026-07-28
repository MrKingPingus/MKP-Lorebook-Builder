// Window sizing for the footer's scaling menu: apply a named preset, report
// which preset is currently live, and expose the raw numbers the Custom row
// edits.
//
// Applying a size re-centres horizontally and clamps to the viewport, the same
// way use-menu-panel does when the side panel expands the window — otherwise a
// preset larger than the screen leaves the window hanging off an edge with no
// way back.
import { useUiStore }  from '../state/ui-store.js';
import { useSettings } from './use-settings.js';
import {
  WINDOW_SIZE_PRESETS,
  WINDOW_PRESET_TOLERANCE,
} from '../constants/scaling.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from '../constants/limits.js';

/** Fill a preset's open fields from the live window; 'viewport' means "as tall as the screen". */
function resolvePreset(preset, current) {
  return {
    width:  preset.width ?? current.width,
    height: preset.height === 'viewport' ? window.innerHeight : (preset.height ?? current.height),
  };
}

function clampSize(width, height) {
  return {
    width:  Math.max(MIN_WINDOW_WIDTH,  Math.min(Math.round(width),  window.innerWidth)),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.min(Math.round(height), window.innerHeight)),
  };
}

export function useWindowScale() {
  const windowSize    = useUiStore((s) => s.windowSize);
  const setWindowSize = useUiStore((s) => s.setWindowSize);
  const setWindowPos  = useUiStore((s) => s.setWindowPos);

  const {
    resetWindow,
    defaultWindowWidth,
    defaultWindowHeight,
    setDefaultWindowWidth,
    setDefaultWindowHeight,
  } = useSettings();

  function applySize(width, height) {
    const size = clampSize(width, height);
    // Read position fresh rather than from a closure — this can be called
    // repeatedly from a number input while the previous set is still settling.
    const pos = useUiStore.getState().windowPos;
    setWindowSize(size);
    setWindowPos({
      x: Math.max(0, Math.round((window.innerWidth - size.width) / 2)),
      y: Math.max(0, Math.min(pos.y, window.innerHeight - size.height)),
    });
  }

  function applyPreset(id) {
    const preset = WINDOW_SIZE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const { width, height } = resolvePreset(preset, windowSize);
    applySize(width, height);
  }

  /** Save the window's current size as the size "Reset to default" returns to. */
  function saveCurrentAsDefault() {
    setDefaultWindowWidth(windowSize.width);
    setDefaultWindowHeight(windowSize.height);
  }

  const activePresetId = WINDOW_SIZE_PRESETS.find((preset) => {
    const resolved = resolvePreset(preset, windowSize);
    const size     = clampSize(resolved.width, resolved.height);
    return Math.abs(size.width  - windowSize.width)  <= WINDOW_PRESET_TOLERANCE
        && Math.abs(size.height - windowSize.height) <= WINDOW_PRESET_TOLERANCE;
  })?.id ?? null;

  return {
    windowSize,
    activePresetId,
    applySize,
    applyPreset,
    resetWindow,
    saveCurrentAsDefault,
    defaultWindowWidth,
    defaultWindowHeight,
  };
}

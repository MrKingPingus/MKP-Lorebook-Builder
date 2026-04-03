// Read and persist all user preference fields through settings-store and storage-service
import { useSettingsStore } from '../state/settings-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { writeJson }        from '../services/storage-service.js';
import { SETTINGS_KEY }     from '../constants/storage-keys.js';

export function useSettings() {
  const counterTiers             = useSettingsStore((s) => s.counterTiers);
  const defaultWindowWidth       = useSettingsStore((s) => s.defaultWindowWidth);
  const defaultWindowHeight      = useSettingsStore((s) => s.defaultWindowHeight);
  const tieredCounterEnabled     = useSettingsStore((s) => s.tieredCounterEnabled);
  const hideSuggestionsByDefault = useSettingsStore((s) => s.hideSuggestionsByDefault);
  const hideEntryStats           = useSettingsStore((s) => s.hideEntryStats);
  const newEntryHotkey           = useSettingsStore((s) => s.newEntryHotkey);
  const undoHotkey               = useSettingsStore((s) => s.undoHotkey);
  const redoHotkey               = useSettingsStore((s) => s.redoHotkey);
  const hotbarSlots              = useSettingsStore((s) => s.hotbarSlots);
  const entryTypeView            = useSettingsStore((s) => s.entryTypeView);
  const fabSize                  = useSettingsStore((s) => s.fabSize);
  const fabCustomSize            = useSettingsStore((s) => s.fabCustomSize);
  const applySettings            = useSettingsStore((s) => s.applySettings);

  function updateSetting(key, value) {
    const patch = { [key]: value };
    applySettings(patch);
    const current = {
      counterTiers,
      defaultWindowWidth,
      defaultWindowHeight,
      tieredCounterEnabled,
      hideSuggestionsByDefault,
      hideEntryStats,
      newEntryHotkey,
      undoHotkey,
      redoHotkey,
      hotbarSlots,
      entryTypeView,
      fabSize,
      fabCustomSize,
      ...patch,
    };
    writeJson(SETTINGS_KEY, current);
  }

  function resetWindow() {
    const w = defaultWindowWidth  || Math.floor(window.innerWidth  / 3);
    const h = defaultWindowHeight || window.innerHeight;
    const x = Math.max(0, Math.round((window.innerWidth  - w) / 2));
    const y = 0;
    useUiStore.getState().setWindowPos({ x, y });
    useUiStore.getState().setWindowSize({ width: w, height: h });
  }

  return {
    counterTiers,
    defaultWindowWidth,
    defaultWindowHeight,
    tieredCounterEnabled,
    hideSuggestionsByDefault,
    hideEntryStats,
    newEntryHotkey,
    undoHotkey,
    redoHotkey,
    hotbarSlots,
    entryTypeView,
    fabSize,
    fabCustomSize,
    resetWindow,
    setCounterTiers:             (v) => updateSetting('counterTiers', v),
    setDefaultWindowWidth:       (v) => updateSetting('defaultWindowWidth', v),
    setDefaultWindowHeight:      (v) => updateSetting('defaultWindowHeight', v),
    setTieredCounterEnabled:     (v) => updateSetting('tieredCounterEnabled', v),
    setHideSuggestionsByDefault: (v) => updateSetting('hideSuggestionsByDefault', v),
    setHideEntryStats:           (v) => updateSetting('hideEntryStats', v),
    setNewEntryHotkey:           (v) => updateSetting('newEntryHotkey', v),
    setUndoHotkey:               (v) => updateSetting('undoHotkey', v),
    setRedoHotkey:               (v) => updateSetting('redoHotkey', v),
    setHotbarSlots:              (v) => updateSetting('hotbarSlots', v),
    setEntryTypeView:            (v) => updateSetting('entryTypeView', v),
    setFabSize:                  (v) => updateSetting('fabSize', v),
    setFabCustomSize:            (v) => updateSetting('fabCustomSize', v),
  };
}

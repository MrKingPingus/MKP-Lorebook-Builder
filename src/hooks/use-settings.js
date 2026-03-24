// Read and persist all user preference fields through settings-store and storage-service
import { useSettingsStore } from '../state/settings-store.js';
import { writeJson } from '../services/storage-service.js';
import { SETTINGS_KEY } from '../constants/storage-keys.js';

export function useSettings() {
  const compactTriggerMode   = useSettingsStore((s) => s.compactTriggerMode);
  const counterTiers         = useSettingsStore((s) => s.counterTiers);
  const defaultWindowWidth   = useSettingsStore((s) => s.defaultWindowWidth);
  const defaultWindowHeight  = useSettingsStore((s) => s.defaultWindowHeight);
  const applySettings        = useSettingsStore((s) => s.applySettings);

  function updateSetting(key, value) {
    const patch = { [key]: value };
    applySettings(patch);
    // Persist merged settings
    const current = {
      compactTriggerMode,
      counterTiers,
      defaultWindowWidth,
      defaultWindowHeight,
      ...patch,
    };
    writeJson(SETTINGS_KEY, current);
  }

  return {
    compactTriggerMode,
    counterTiers,
    defaultWindowWidth,
    defaultWindowHeight,
    setCompactTriggerMode: (v) => updateSetting('compactTriggerMode', v),
    setCounterTiers:       (v) => updateSetting('counterTiers', v),
    setDefaultWindowWidth: (v) => updateSetting('defaultWindowWidth', v),
    setDefaultWindowHeight:(v) => updateSetting('defaultWindowHeight', v),
  };
}

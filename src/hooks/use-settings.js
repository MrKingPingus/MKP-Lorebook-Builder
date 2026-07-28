// Read and persist all user preference fields through settings-store and storage-service
import { useSettingsStore } from '../state/settings-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { writeJson }        from '../services/storage-service.js';
import { SETTINGS_KEY }     from '../constants/storage-keys.js';

export function useSettings() {
  const counterTiers             = useSettingsStore((s) => s.counterTiers);
  const defaultWindowWidth       = useSettingsStore((s) => s.defaultWindowWidth);
  const defaultWindowHeight      = useSettingsStore((s) => s.defaultWindowHeight);
  const tieredCounterEnabled     = useSettingsStore((s) => s.tieredCounterEnabled);
  const hideSuggestionsByDefault = useSettingsStore((s) => s.hideSuggestionsByDefault);
  const hideEntryStats           = useSettingsStore((s) => s.hideEntryStats);
  const markPrivateEntries       = useSettingsStore((s) => s.markPrivateEntries);
  const theme                    = useSettingsStore((s) => s.theme);
  const customColors             = useSettingsStore((s) => s.customColors);
  const uiScale                  = useSettingsStore((s) => s.uiScale);
  const reduceMotion             = useSettingsStore((s) => s.reduceMotion);
  const keybindings              = useSettingsStore((s) => s.keybindings);
  const triggerDelimiter         = useSettingsStore((s) => s.triggerDelimiter);
  const hotbarSlots              = useSettingsStore((s) => s.hotbarSlots);
  const entryHeaderSize          = useSettingsStore((s) => s.entryHeaderSize);
  const folderCollapseStages     = useSettingsStore((s) => s.folderCollapseStages);
  const condensedShowStats       = useSettingsStore((s) => s.condensedShowStats);
  const fabSize                  = useSettingsStore((s) => s.fabSize);
  const fabCustomSize            = useSettingsStore((s) => s.fabCustomSize);
  const fabQuickMenuEnabled      = useSettingsStore((s) => s.fabQuickMenuEnabled);
  const rollbackDefaultEnabled   = useSettingsStore((s) => s.rollbackDefaultEnabled);
  const keepMenuOpenAfterImport  = useSettingsStore((s) => s.keepMenuOpenAfterImport);
  const crosstalkEnabled         = useSettingsStore((s) => s.crosstalkEnabled);
  const crosstalkSwapMode        = useSettingsStore((s) => s.crosstalkSwapMode);
  const thesaurusEnabled         = useSettingsStore((s) => s.thesaurusEnabled);
  const funnyFishEnabled         = useSettingsStore((s) => s.funnyFishEnabled);
  const storageQuotaProfile      = useSettingsStore((s) => s.storageQuotaProfile);
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
      markPrivateEntries,
      theme,
      customColors,
      uiScale,
      reduceMotion,
      keybindings,
      triggerDelimiter,
      hotbarSlots,
      entryHeaderSize,
      folderCollapseStages,
      condensedShowStats,
      fabSize,
      fabCustomSize,
      fabQuickMenuEnabled,
      rollbackDefaultEnabled,
      keepMenuOpenAfterImport,
      crosstalkEnabled,
      crosstalkSwapMode,
      thesaurusEnabled,
      funnyFishEnabled,
      storageQuotaProfile,
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
    markPrivateEntries,
    theme,
    customColors,
    uiScale,
    reduceMotion,
    keybindings,
    triggerDelimiter,
    hotbarSlots,
    entryHeaderSize,
    folderCollapseStages,
    condensedShowStats,
    fabSize,
    fabCustomSize,
    fabQuickMenuEnabled,
    rollbackDefaultEnabled,
    keepMenuOpenAfterImport,
    crosstalkEnabled,
    crosstalkSwapMode,
    thesaurusEnabled,
    funnyFishEnabled,
    storageQuotaProfile,
    resetWindow,
    setCounterTiers:             (v) => updateSetting('counterTiers', v),
    setDefaultWindowWidth:       (v) => updateSetting('defaultWindowWidth', v),
    setDefaultWindowHeight:      (v) => updateSetting('defaultWindowHeight', v),
    setTieredCounterEnabled:     (v) => updateSetting('tieredCounterEnabled', v),
    setHideSuggestionsByDefault: (v) => updateSetting('hideSuggestionsByDefault', v),
    setHideEntryStats:           (v) => updateSetting('hideEntryStats', v),
    setMarkPrivateEntries:       (v) => updateSetting('markPrivateEntries', v),
    setTheme:                    (v) => updateSetting('theme', v),
    setCustomColors:             (v) => updateSetting('customColors', v),
    setUiScale:                  (v) => updateSetting('uiScale', v),
    setReduceMotion:             (v) => updateSetting('reduceMotion', v),
    setKeybindings:              (v) => updateSetting('keybindings', v),
    setTriggerDelimiter:         (v) => updateSetting('triggerDelimiter', v),
    setHotbarSlots:              (v) => updateSetting('hotbarSlots', v),
    setEntryHeaderSize:          (v) => updateSetting('entryHeaderSize', v),
    setFolderCollapseStages:     (v) => updateSetting('folderCollapseStages', v),
    setCondensedShowStats:       (v) => updateSetting('condensedShowStats', v),
    setFabSize:                  (v) => updateSetting('fabSize', v),
    setFabCustomSize:            (v) => updateSetting('fabCustomSize', v),
    setFabQuickMenuEnabled:      (v) => updateSetting('fabQuickMenuEnabled', v),
    setRollbackDefaultEnabled:   (v) => updateSetting('rollbackDefaultEnabled', v),
    setKeepMenuOpenAfterImport:  (v) => updateSetting('keepMenuOpenAfterImport', v),
    setCrosstalkEnabled: (v) => {
      updateSetting('crosstalkEnabled', v);
      // Turning crosstalk off nulls the reference id so a re-show starts
      // fresh. Active id and selection stay put — the active book doesn't
      // change when the panel is hidden.
      if (!v) useLorebookStore.getState().setReferenceLorebookId(null);
    },
    setThesaurusEnabled:         (v) => updateSetting('thesaurusEnabled', v),
    setCrosstalkSwapMode:        (v) => updateSetting('crosstalkSwapMode', v),
    setFunnyFishEnabled:         (v) => updateSetting('funnyFishEnabled', v),
    setStorageQuotaProfile:      (v) => updateSetting('storageQuotaProfile', v),
  };
}

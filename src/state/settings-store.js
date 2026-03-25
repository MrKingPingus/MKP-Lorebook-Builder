// Zustand store: user preferences (compact trigger mode, counter tiers, default window size)
import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../constants/defaults.js';

export const useSettingsStore = create((set) => ({
  ...DEFAULT_SETTINGS,

  setCompactTriggerMode:       (compactTriggerMode)       => set({ compactTriggerMode }),
  setCounterTiers:             (counterTiers)             => set({ counterTiers }),
  setDefaultWindowWidth:       (defaultWindowWidth)       => set({ defaultWindowWidth }),
  setDefaultWindowHeight:      (defaultWindowHeight)      => set({ defaultWindowHeight }),
  setTieredCounterEnabled:     (tieredCounterEnabled)     => set({ tieredCounterEnabled }),
  setHideSuggestionsByDefault: (hideSuggestionsByDefault) => set({ hideSuggestionsByDefault }),
  setHideEntryStats:           (hideEntryStats)           => set({ hideEntryStats }),
  setNewEntryHotkey:           (newEntryHotkey)           => set({ newEntryHotkey }),

  applySettings: (settings) => set(settings),
}));

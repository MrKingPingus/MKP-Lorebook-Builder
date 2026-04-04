// Zustand store: user preferences (counter tiers, default window size, display toggles)
import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../constants/defaults.js';

export const useSettingsStore = create((set) => ({
  ...DEFAULT_SETTINGS,

  setCounterTiers:             (counterTiers)             => set({ counterTiers }),
  setDefaultWindowWidth:       (defaultWindowWidth)       => set({ defaultWindowWidth }),
  setDefaultWindowHeight:      (defaultWindowHeight)      => set({ defaultWindowHeight }),
  setTieredCounterEnabled:     (tieredCounterEnabled)     => set({ tieredCounterEnabled }),
  setHideSuggestionsByDefault: (hideSuggestionsByDefault) => set({ hideSuggestionsByDefault }),
  setHideEntryStats:           (hideEntryStats)           => set({ hideEntryStats }),
  setNewEntryHotkey:           (newEntryHotkey)           => set({ newEntryHotkey }),
  setUndoHotkey:               (undoHotkey)               => set({ undoHotkey }),
  setRedoHotkey:               (redoHotkey)               => set({ redoHotkey }),
  setTriggerDelimiter:         (triggerDelimiter)         => set({ triggerDelimiter }),
  setHotbarSlots:              (hotbarSlots)              => set({ hotbarSlots }),
  setEntryTypeView:            (entryTypeView)            => set({ entryTypeView }),
  setFabSize:                  (fabSize)                  => set({ fabSize }),
  setFabCustomSize:            (fabCustomSize)            => set({ fabCustomSize }),

  applySettings: (settings) => set(settings),
}));

// Zustand store: host-mode session state. `enabled` is set exactly once, in
// main.jsx, before React mounts; everything else is driven by the orchestrator
// in hooks/use-host.js. In standalone mode this store is inert — `enabled`
// stays false and nothing reads past it.
import { create } from 'zustand';

export const useHostStore = create((set) => ({
  enabled:     false,   // running inside a CharSnap iframe with ?host=charsnap
  hostOrigin:  null,    // origin locked onto after the first valid inbound message
  loaded:      false,   // an mkp:load has been applied; the builder is usable
  dirty:       false,   // local content differs from what the host last confirmed
  saving:      false,   // an mkp:save is out and awaiting a verdict
  saveErrors:  [],      // [{ index, field, message }] from validation or mkp:save-rejected
  conflict:    null,    // null | { kind: 'load' | 'load-pending' | 'save', … }
  themeTokens: null,    // { '--bg': '#…', … } pushed by the host; never persisted
  lastSavedAt: null,    // ms timestamp of the last mkp:saved
  notice:      null,    // one-line message for the footer (timeout, storage full, …)
  ephemeral:   false,   // storage was full: the active draft lives in memory only

  // Actions the orchestrator binds once it has mounted. Components call these
  // through the store so they do not have to be threaded down as props.
  saveToHost:      null,  // ({ force }) => void
  resolveConflict: null,  // (choice) => void
  focusError:      null,  // ({ index }) => void — bring an offending entry on screen

  setEnabled:     (enabled)     => set({ enabled }),
  setHostOrigin:  (hostOrigin)  => set({ hostOrigin }),
  setLoaded:      (loaded)      => set({ loaded }),
  setDirty:       (dirty)       => set({ dirty }),
  setSaving:      (saving)      => set({ saving }),
  setSaveErrors:  (saveErrors)  => set({ saveErrors }),
  setConflict:    (conflict)    => set({ conflict }),
  setThemeTokens: (themeTokens) => set({ themeTokens }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  setNotice:      (notice)      => set({ notice }),
  setEphemeral:   (ephemeral)   => set({ ephemeral }),
  bindActions:    ({ saveToHost = null, resolveConflict = null, focusError = null }) =>
    set({ saveToHost, resolveConflict, focusError }),
}));

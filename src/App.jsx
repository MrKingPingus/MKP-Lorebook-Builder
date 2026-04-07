// Root component — composes <FloatingWindow>, mounts autosave effect and keyboard shortcuts
import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { FloatingWindow }        from './components/layout/FloatingWindow.jsx';
import { useAutosave }           from './hooks/use-autosave.js';
import { useKeyboardShortcuts }  from './hooks/use-keyboard-shortcuts.js';
import { useEntries }            from './hooks/use-entries.js';
import { useUndoRedo }           from './hooks/use-undo-redo.js';
import { readJson, writeJson }   from './services/storage-service.js';
import { createEmptyLorebook }   from './services/entry-factory.js';
import { addToIndex }            from './services/lorebook-index.js';
import { useLorebookStore }      from './state/lorebook-store.js';
import { useSettingsStore }      from './state/settings-store.js';
import { useUiStore }            from './state/ui-store.js';
import { useViewportResize }     from './hooks/use-viewport-resize.js';
import {
  LOREBOOK_INDEX_KEY,
  LOREBOOK_KEY_PREFIX,
  SETTINGS_KEY,
  WINDOW_STATE_KEY,
} from './constants/storage-keys.js';
import { DEFAULT_WINDOW_FRACTION } from './constants/defaults.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT } from './constants/limits.js';

/** Bootstrap: load persisted state from localStorage into stores on first mount. */
function useBootstrap() {
  const setLorebooks        = useLorebookStore((s) => s.setLorebooks);
  const setLorebookIndex    = useLorebookStore((s) => s.setLorebookIndex);
  const setActiveLorebookId = useLorebookStore((s) => s.setActiveLorebookId);
  const setLorebook         = useLorebookStore((s) => s.setLorebook);
  const applySettings       = useSettingsStore((s) => s.applySettings);
  const setWindowSize       = useUiStore((s) => s.setWindowSize);
  const setWindowPos        = useUiStore((s) => s.setWindowPos);

  useEffect(() => {
    // Load settings
    const settings = readJson(SETTINGS_KEY);
    if (settings) {
      applySettings(settings);
    }

    // Restore persisted window state, or fall back to default centre-two-thirds layout
    const saved = readJson(WINDOW_STATE_KEY);
    if (saved?.size && saved?.pos) {
      // Clamp to current viewport in case screen size changed since last save
      const sw = Math.max(MIN_WINDOW_WIDTH,  Math.min(saved.size.width,  window.innerWidth));
      const sh = Math.max(MIN_WINDOW_HEIGHT, Math.min(saved.size.height, window.innerHeight));
      const sx = Math.max(0, Math.min(saved.pos.x, window.innerWidth  - sw));
      const sy = Math.max(0, Math.min(saved.pos.y, window.innerHeight - sh));
      setWindowSize({ width: sw, height: sh });
      setWindowPos({ x: sx, y: sy });
    } else {
      const w = Math.floor(window.innerWidth * DEFAULT_WINDOW_FRACTION);
      setWindowSize({ width: w, height: window.innerHeight });
      setWindowPos({ x: Math.floor((window.innerWidth - w) / 2), y: 0 });
    }

    // Load lorebook index
    const index = readJson(LOREBOOK_INDEX_KEY, []);
    setLorebookIndex(index);

    if (index.length > 0) {
      // Load all lorebooks into memory
      const lorebooks = {};
      for (const item of index) {
        const lb = readJson(LOREBOOK_KEY_PREFIX + item.id);
        if (lb) lorebooks[lb.id] = lb;
      }
      setLorebooks(lorebooks);
      setActiveLorebookId(index[0].id);
    } else {
      // First run — create a default lorebook and prompt user to name it
      const lb     = createEmptyLorebook();
      const newIdx = addToIndex([], lb);
      setLorebook(lb);
      setLorebookIndex(newIdx ?? []);
      setActiveLorebookId(lb.id);
      writeJson(LOREBOOK_KEY_PREFIX + lb.id, lb);
      writeJson(LOREBOOK_INDEX_KEY, newIdx ?? []);
      useUiStore.getState().setPendingFocusLorebookName(true);
    }
  // Run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  useBootstrap();
  useAutosave();
  useViewportResize();

  const { addEntry }   = useEntries();
  const { undo, redo } = useUndoRedo();
  const newEntryHotkey = useSettingsStore((s) => s.newEntryHotkey);
  const undoHotkey     = useSettingsStore((s) => s.undoHotkey);
  const redoHotkey     = useSettingsStore((s) => s.redoHotkey);

  useKeyboardShortcuts({ onNewEntry: addEntry, onUndo: undo, onRedo: redo, hotkey: newEntryHotkey, undoHotkey, redoHotkey });

  return (
    <div className="app-root">
      <FloatingWindow />
      <Analytics />
    </div>
  );
}

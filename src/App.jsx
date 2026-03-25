// Root component — composes <FloatingWindow>, mounts autosave effect and keyboard shortcuts
import { useEffect } from 'react';
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
import {
  LOREBOOK_INDEX_KEY,
  LOREBOOK_KEY_PREFIX,
  SETTINGS_KEY,
} from './constants/storage-keys.js';

/** Bootstrap: load persisted state from localStorage into stores on first mount. */
function useBootstrap() {
  const setLorebooks        = useLorebookStore((s) => s.setLorebooks);
  const setLorebookIndex    = useLorebookStore((s) => s.setLorebookIndex);
  const setActiveLorebookId = useLorebookStore((s) => s.setActiveLorebookId);
  const setLorebook         = useLorebookStore((s) => s.setLorebook);
  const applySettings       = useSettingsStore((s) => s.applySettings);
  const setWindowSize       = useUiStore((s) => s.setWindowSize);

  useEffect(() => {
    // Load settings
    const settings = readJson(SETTINGS_KEY);
    if (settings) {
      applySettings(settings);
      if (settings.defaultWindowWidth && settings.defaultWindowHeight) {
        setWindowSize({ width: settings.defaultWindowWidth, height: settings.defaultWindowHeight });
      }
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
      // First run — create a default lorebook
      const lb     = createEmptyLorebook({ name: 'My Lorebook' });
      const newIdx = addToIndex([], lb);
      setLorebook(lb);
      setLorebookIndex(newIdx ?? []);
      setActiveLorebookId(lb.id);
      writeJson(LOREBOOK_KEY_PREFIX + lb.id, lb);
      writeJson(LOREBOOK_INDEX_KEY, newIdx ?? []);
    }
  // Run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  useBootstrap();
  useAutosave();

  const { addEntry }   = useEntries();
  const { undo, redo } = useUndoRedo();
  const newEntryHotkey = useSettingsStore((s) => s.newEntryHotkey);

  useKeyboardShortcuts({ onNewEntry: addEntry, onUndo: undo, onRedo: redo, hotkey: newEntryHotkey });

  return (
    <div className="app-root">
      <FloatingWindow />
    </div>
  );
}

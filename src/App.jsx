// Root component — composes <FloatingWindow>, mounts autosave effect and keyboard shortcuts
import { useEffect, useMemo, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { FloatingWindow }        from './components/layout/FloatingWindow.jsx';
import { KeyboardHelpOverlay }   from './components/feature/KeyboardHelpOverlay.jsx';
import { useAutosave }           from './hooks/use-autosave.js';
import { useTheme }              from './hooks/use-theme.js';
import { useAccessibility }      from './hooks/use-accessibility.js';
import { useKeyboardShortcuts }  from './hooks/use-keyboard-shortcuts.js';
import { useKeybindings }        from './hooks/use-keybindings.js';
import { useDismissLayer }       from './hooks/use-dismiss-layer.js';
import { useSettings }           from './hooks/use-settings.js';
import { useReferenceLorebook }  from './hooks/use-reference-lorebook.js';
import { useEntries }            from './hooks/use-entries.js';
import { useUndoRedo }           from './hooks/use-undo-redo.js';
import { readJson, writeJson, detectQuotaProfile } from './services/storage-service.js';
import { migrateLegacyHotkeys }  from './services/keychord.js';
import { DISMISS_PRIORITY }      from './services/dismiss-stack.js';
import { createEmptyLorebook }   from './services/entry-factory.js';
import { addToIndex }            from './services/lorebook-index.js';
import { useLorebookStore }      from './state/lorebook-store.js';
import { useSettingsStore }      from './state/settings-store.js';
import { useUiStore }            from './state/ui-store.js';
import { useViewportResize }     from './hooks/use-viewport-resize.js';
import { usePickFromReference }  from './hooks/use-pick-from-reference.js';
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
    // Load settings, folding legacy single-letter hotkey fields into the
    // keybindings override map (one-time; persisted back if anything changed).
    const rawSettings = readJson(SETTINGS_KEY);
    const settings = migrateLegacyHotkeys(rawSettings);
    if (settings) {
      applySettings(settings);
      if (settings !== rawSettings) writeJson(SETTINGS_KEY, settings);
    }

    // First-boot UA detect for the storage quota profile. Also fills in the
    // field for existing users upgrading from a build before this setting
    // existed. Once set, the user's chosen value is respected on every later
    // boot — we never silently re-detect on top of an explicit choice.
    if (!useSettingsStore.getState().storageQuotaProfile) {
      const detected = detectQuotaProfile();
      applySettings({ storageQuotaProfile: detected });
      writeJson(SETTINGS_KEY, { ...(settings ?? {}), storageQuotaProfile: detected });
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
      // First run — create a default lorebook marked as a placeholder so an
      // immediate Import-as-New silently discards it instead of leaving a
      // dangling "New Lorebook" alongside the imported book.
      const lb     = createEmptyLorebook({ placeholder: true });
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
  useTheme();
  useAccessibility();
  useViewportResize();

  const { addEntry }   = useEntries();
  const { undo, redo } = useUndoRedo();
  const { bindings }   = useKeybindings();
  const { crosstalkEnabled, setCrosstalkEnabled } = useSettings();
  const { referenceLorebook, swapReference } = useReferenceLorebook();
  const { pickFromReferenceMode, exitPickFromReference } = usePickFromReference();

  // ui-store setters used by the wired hotkey handlers + the Escape stack.
  const searchMode        = useUiStore((s) => s.searchMode);
  const compareEntryId    = useUiStore((s) => s.compareEntryId);
  const setSearchMode     = useUiStore((s) => s.setSearchMode);
  const setCompareEntryId = useUiStore((s) => s.setCompareEntryId);
  const setActiveMenuPanel = useUiStore((s) => s.setActiveMenuPanel);
  const requestSearchFocus = useUiStore((s) => s.requestSearchFocus);
  const requestFindFocus   = useUiStore((s) => s.requestFindFocus);
  const requestImportPick  = useUiStore((s) => s.requestImportPick);
  const openExportMenuCentered = useUiStore((s) => s.openExportMenuCentered);
  const toggleKeyboardHelp = useUiStore((s) => s.toggleKeyboardHelp);

  // Expand / collapse all — mirror the Filter bar toggle: fire the opposite
  // pulse to whatever the last bulk action was.
  function toggleExpandCollapseAll() {
    const ui = useUiStore.getState();
    if (ui.bulkExpanded) ui.collapseAllEntries();
    else                 ui.expandAllEntries();
  }

  // Handler map keyed by registry action id. Actions without a handler here are
  // reserved defaults (collision-checked) that stay unwired until their batch.
  const handlers = useMemo(() => ({
    new_entry:           () => addEntry(),
    undo:                () => undo(),
    redo:                () => redo(),
    toggle_select:       () => setSearchMode(useUiStore.getState().searchMode === 'select' ? 'search' : 'select'),
    expand_collapse_all: () => toggleExpandCollapseAll(),
    focus_search:        () => requestSearchFocus(),
    focus_find_replace:  () => requestFindFocus(),
    toggle_reference:    () => setCrosstalkEnabled(!useSettingsStore.getState().crosstalkEnabled),
    swap_reference:      () => { if (referenceLorebook) swapReference(); },
    export:              () => openExportMenuCentered(),
    import_entries:      () => requestImportPick(),
    open_settings:       () => setActiveMenuPanel('settings'),
    keyboard_help:       () => toggleKeyboardHelp(),
  }), [addEntry, undo, redo, setSearchMode, requestSearchFocus, requestFindFocus, setCrosstalkEnabled, referenceLorebook, swapReference, openExportMenuCentered, requestImportPick, setActiveMenuPanel, toggleKeyboardHelp]);

  // Any hotkey (other than the help toggle itself) also dismisses the open
  // cheat sheet — you press the shortcut you just looked up and the guide gets
  // out of the way.
  const wrappedHandlers = useMemo(() => {
    const out = {};
    for (const [id, fn] of Object.entries(handlers)) {
      out[id] = (e) => {
        if (id !== 'keyboard_help' && useUiStore.getState().keyboardHelpOpen) {
          useUiStore.getState().setKeyboardHelpOpen(false);
        }
        fn(e);
      };
    }
    return out;
  }, [handlers]);

  // Context gate for context-scoped bindings (e.g. crosstalk-only actions).
  const isEnabled = useCallback(
    (ctx) => (ctx === 'crosstalk' ? crosstalkEnabled : true),
    [crosstalkEnabled],
  );

  useKeyboardShortcuts({ bindings, handlers: wrappedHandlers, isEnabled });

  // Escape priority stack — app-level dismissable modes. Popovers register
  // themselves (higher priority) from their own components. Order here is set
  // by DISMISS_PRIORITY, not registration order.
  useDismissLayer('app:find-replace', searchMode === 'find-replace', DISMISS_PRIORITY.findReplace, () => setSearchMode('search'));
  useDismissLayer('app:compare',      compareEntryId != null,         DISMISS_PRIORITY.compare,      () => setCompareEntryId(null));
  useDismissLayer('app:pick-from-ref', pickFromReferenceMode,         DISMISS_PRIORITY.pickFromReference, () => exitPickFromReference(false));
  useDismissLayer('app:select',       searchMode === 'select',        DISMISS_PRIORITY.select,       () => setSearchMode('search'));

  return (
    <div className="app-root">
      <FloatingWindow />
      <KeyboardHelpOverlay />
      <Analytics />
    </div>
  );
}

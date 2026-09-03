// Root component — composes <FloatingWindow>, mounts autosave effect and keyboard shortcuts
import { useEffect, useMemo, useCallback } from 'react';
import { FloatingWindow }        from './components/layout/FloatingWindow.jsx';
import { KeyboardHelpOverlay }   from './components/feature/KeyboardHelpOverlay.jsx';
import { ReferenceChooser }      from './components/feature/ReferenceChooser.jsx';
import { FeatureTour }           from './components/feature/FeatureTour.jsx';
import { HostConflictDialog }    from './components/feature/HostConflictDialog.jsx';
import { useAutosave }           from './hooks/use-autosave.js';
import { useHost, useHostMode }  from './hooks/use-host.js';
import { useHostStore }          from './state/host-store.js';
import { useTheme }              from './hooks/use-theme.js';
import { useAccessibility }      from './hooks/use-accessibility.js';
import { useKeyboardShortcuts }  from './hooks/use-keyboard-shortcuts.js';
import { useKeybindings }        from './hooks/use-keybindings.js';
import { useDismissLayer }       from './hooks/use-dismiss-layer.js';
import { useReferenceLorebook }  from './hooks/use-reference-lorebook.js';
import { useEntries }            from './hooks/use-entries.js';
import { useUndoRedo }           from './hooks/use-undo-redo.js';
import { readJson, writeJson, saveLorebook, saveLorebookIndex, detectQuotaProfile } from './services/storage-service.js';
import { migrateLegacyHotkeys }  from './services/keychord.js';
import { DISMISS_PRIORITY }      from './services/dismiss-stack.js';
import { createEmptyLorebook }   from './services/entry-factory.js';
import { addToIndex }            from './services/lorebook-index.js';
import { useLorebookStore }      from './state/lorebook-store.js';
import { useSettingsStore }      from './state/settings-store.js';
import { useUiStore }            from './state/ui-store.js';
import { useTemplatesStore }     from './state/templates-store.js';
import { loadStoredTemplates }   from './hooks/use-templates.js';
import { useViewportResize }     from './hooks/use-viewport-resize.js';
import { useCloseLayersOnBreakpoint } from './hooks/use-close-layers-on-breakpoint.js';
import { usePickFromReference }  from './hooks/use-pick-from-reference.js';
import {
  LOREBOOK_INDEX_KEY,
  LOREBOOK_KEY_PREFIX,
  SETTINGS_KEY,
  WINDOW_STATE_KEY,
} from './constants/storage-keys.js';
import { DEFAULT_WINDOW_FRACTION, DEFAULT_WINDOW, LEGACY_DEFAULT_WINDOW } from './constants/defaults.js';
import { MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT, CHAR_LIMIT, CHAR_WARN_YELLOW, CHAR_WARN_RED } from './constants/limits.js';

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

    // One-time settings fix-ups, accumulated into a single patch so the last
    // write can't clobber an earlier one.
    const patch = {};

    // First-boot UA detect for the storage quota profile. Also fills in the
    // field for existing users upgrading from a build before this setting
    // existed. Once set, the user's chosen value is respected on every later
    // boot — we never silently re-detect on top of an explicit choice.
    if (!useSettingsStore.getState().storageQuotaProfile) {
      patch.storageQuotaProfile = detectQuotaProfile();
    }

    // Raise the stored default window size to the 1200×900 working size, but
    // only for users still sitting on the untouched pre-13A 760×620. Settings
    // persist and win over the constant, so without this the new default would
    // reach nobody who had ever launched the app. A size the user actually
    // chose is left exactly as they set it.
    const stored = useSettingsStore.getState();
    if (stored.defaultWindowWidth  === LEGACY_DEFAULT_WINDOW.width &&
        stored.defaultWindowHeight === LEGACY_DEFAULT_WINDOW.height) {
      patch.defaultWindowWidth  = DEFAULT_WINDOW.width;
      patch.defaultWindowHeight = DEFAULT_WINDOW.height;
    }

    // Grow counterTiers from the two-stop { yellow, red } shape to the
    // three-stop { yellow, orange, red } the four-colour and gradient scales
    // read. The stored `red` was the DANGER stop, so it becomes `orange` and
    // the new `red` takes the character cap. Written this way round the
    // three-colour scale keeps painting red at exactly the number the user
    // chose — only the extra band above it is new. Reading it as the top stop
    // instead would silently move their red up by 500 characters.
    const tiers = stored.counterTiers;
    if (tiers && tiers.orange == null) {
      patch.counterTiers = {
        yellow: tiers.yellow ?? CHAR_WARN_YELLOW,
        orange: tiers.red    ?? CHAR_WARN_RED,
        red:    CHAR_LIMIT,
      };
    }

    if (Object.keys(patch).length > 0) {
      applySettings(patch);
      writeJson(SETTINGS_KEY, { ...(settings ?? {}), ...patch });
    }

    // Host mode: the frame fills the iframe, so no window geometry to restore,
    // and no placeholder book — the host's mkp:load decides what is active.
    const hostMode = useHostStore.getState().enabled;

    // Restore persisted window state, or fall back to default centre-two-thirds layout
    const saved = hostMode ? null : readJson(WINDOW_STATE_KEY);
    if (hostMode) {
      // nothing — .floating-window--fill ignores windowPos/windowSize
    } else if (saved?.size && saved?.pos) {
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

    // Templates are global and tiny, so they load in one read alongside the
    // index rather than lazily — every surface that offers them (the entry ⋯
    // menu, Settings) wants the whole list the moment it opens.
    useTemplatesStore.getState().setAll(loadStoredTemplates());

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
      // In host mode the drafts are loaded but none is activated: use-host
      // picks (or creates) the one matching the host's lorebook.
      if (!hostMode) setActiveLorebookId(index[0].id);
    } else if (hostMode) {
      // First run inside CharSnap — an empty library, and nothing to create
      // until the host says what to open.
    } else {
      // First run — create a default lorebook marked as a placeholder so an
      // immediate Import-as-New silently discards it instead of leaving a
      // dangling "New Lorebook" alongside the imported book.
      const lb     = createEmptyLorebook({ placeholder: true });
      const newIdx = addToIndex([], lb);
      setLorebook(lb);
      setLorebookIndex(newIdx ?? []);
      setActiveLorebookId(lb.id);
      saveLorebook(lb);
      saveLorebookIndex(newIdx ?? []);
      useUiStore.getState().setPendingFocusLorebookName(true);
    }
  // Run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function App() {
  useBootstrap();
  useHost();
  useAutosave();
  useTheme();
  useAccessibility();
  useViewportResize();
  useCloseLayersOnBreakpoint();

  const { addEntry }   = useEntries();
  const { undo, redo } = useUndoRedo();
  const { bindings }   = useKeybindings();
  const { referenceLorebook, swapReference, crosstalkEnabled } = useReferenceLorebook();
  const { pickFromReferenceMode, exitPickFromReference } = usePickFromReference();
  const hostMode = useHostMode();

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
  const setReferenceChooserOpen = useUiStore((s) => s.setReferenceChooserOpen);

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
    select_all_visible:  () => useUiStore.getState().requestSelectAllVisible(),
    deselect_all:        () => useUiStore.getState().clearSelection(),
    focus_search:        () => requestSearchFocus(),
    focus_find_replace:  () => requestFindFocus(),
    // Opens the chooser rather than flipping a flag — there is no reference
    // mode to toggle any more, only a book to pair. The action id is kept as
    // `toggle_reference` because users' custom chords are stored against it;
    // renaming it would silently drop anyone's rebound Alt+R.
    toggle_reference:    () => setReferenceChooserOpen(true),
    swap_reference:      () => { if (referenceLorebook) swapReference(); },
    export:              () => openExportMenuCentered(),
    import_entries:      () => requestImportPick(),
    open_settings:       () => setActiveMenuPanel('settings'),
    keyboard_help:       () => toggleKeyboardHelp(),
    // Host mode only (the binding is filtered out of the registry otherwise).
    save_to_host:        () => useHostStore.getState().saveToHost?.(),
  }), [addEntry, undo, redo, setSearchMode, requestSearchFocus, requestFindFocus, setReferenceChooserOpen, referenceLorebook, swapReference, openExportMenuCentered, requestImportPick, setActiveMenuPanel, toggleKeyboardHelp]);

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
    (ctx) => {
      if (ctx === 'crosstalk') return crosstalkEnabled;
      if (ctx === 'host')      return hostMode;
      return true;
    },
    [crosstalkEnabled, hostMode],
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
      {/* At the root, not inside whatever opened it — the title menu, the
          hotbar and the Lorebooks panel all have `overflow: hidden` ancestors. */}
      <ReferenceChooser />
      {/* Not inside the Lander that launches it: the tour spotlights the
          builder, so it has to outlive the view it was started from. */}
      <FeatureTour />
      <KeyboardHelpOverlay />
      {/* Host mode's "which copy?" prompts. At the root for the same reason as
          the chooser: it must sit over the mobile detail panel too. */}
      {hostMode && <HostConflictDialog />}
    </div>
  );
}

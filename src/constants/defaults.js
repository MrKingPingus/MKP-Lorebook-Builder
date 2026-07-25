// Default shapes for new entries, lorebook, settings, and window size/position
import { DEFAULT_TYPE } from './entry-types.js';
import { CHAR_WARN_YELLOW, CHAR_WARN_RED } from './limits.js';

export const DEFAULT_WINDOW = { width: 760, height: 620, x: 60, y: 40 };
export const DEFAULT_WINDOW_FRACTION = 2 / 3;

export const DEFAULT_SETTINGS = {
  counterTiers:             { yellow: CHAR_WARN_YELLOW, red: CHAR_WARN_RED },
  rollbackDefaultEnabled:   false, // when true, new lorebooks start with rollback On
  defaultWindowWidth:       DEFAULT_WINDOW.width,
  defaultWindowHeight:      DEFAULT_WINDOW.height,
  tieredCounterEnabled:     true,
  hideSuggestionsByDefault: false,
  hideEntryStats:           false,
  markPrivateEntries:       false, // when true, show an eye-off badge on private entries (public entries always show the eye badge)
  // Color theme: 'dark' (default) | 'light' | 'high-contrast' | 'custom'.
  theme:                    'dark',
  // Custom-theme core token overrides: { '--bg': '#..', ... }. Empty = defaults
  // (see constants/themes.js). Only consulted when theme === 'custom'.
  customColors:             {},
  // Accessibility: root text-scale multiplier (see constants/accessibility.js)
  // and a manual reduced-motion override (the OS setting is honoured anyway).
  uiScale:                  1,
  reduceMotion:             false,
  // Keyboard shortcut overrides: { [actionId]: canonicalChord }. Stores only
  // deltas from the registry defaults (src/constants/keybindings.js); an empty
  // map means every action is on its default chord. Legacy single-letter
  // newEntry/undo/redo fields are migrated into this map on boot.
  keybindings:              {},
  triggerDelimiter:         ',',
  // 6 hotbar slots: 3 left of FAB, 3 right. null = empty slot.
  // Layout: [Left1, Left2, Left3, Right1, Right2, Right3]
  //   Left:  Import · (empty) · Undo   |   Right: Redo · (empty) · Export
  hotbarSlots:              ['append_import', null, 'undo', 'redo', null, 'make_export'],
  // Entry card header height (desktop collapsed row): 'default' | 'medium' | 'large'.
  // Taller rows make a long lorebook easier to scan for users who find the dense
  // default overwhelming.
  entryHeaderSize:          'default',
  // FAB (+ button) size
  fabSize:                  'large',     // 'small' | 'medium' | 'large' | 'custom'
  fabCustomSize:            60,          // px, used only when fabSize === 'custom'
  // Hover (desktop) / long-press (touch) on the FAB opens a popover listing the
  // hotbar actions. Disable to keep the FAB strictly Add-Entry.
  fabQuickMenuEnabled:      true,
  // Desktop: keep the menu panel open after importing a lorebook (mobile always closes)
  keepMenuOpenAfterImport:  false,
  // Show the read-only reference panel beside the active panel for cross-book search/find-replace
  crosstalkEnabled:         false,
  // Crosstalk pane behaviour:
  //   'click-to-edit'        — clicking the reference pane swaps roles AND visually swaps panes (default)
  //   'fixed-active-left'    — active pinned to the left column; a Swap button trades books between roles
  //   'fixed-active-right'   — active pinned to the right column; same behaviour, mirrored
  crosstalkSwapMode:        'click-to-edit',
  // When on, the title-bar logo is the circular Sacabambaspis portrait at 45px.
  // When off, the original 📖 book emoji renders at its original 16px size.
  funnyFishEnabled:         true,
  // When on, hovering a suggestion chip (or long-pressing on mobile) opens a synonym popover
  // sourced from the Datamuse API (rel_syn, strict synonyms only). In-memory cache only.
  thesaurusEnabled:         true,
  // 'webkit' (5 MB) | 'chromium-gecko' (10 MB) — sizes the storage usage ring against the
  // documented per-engine localStorage cap. null on first boot; bootstrap UA-detects and
  // persists, then the user can override via Settings → Window & Layout.
  storageQuotaProfile:      null,
};

export const DEFAULT_ENTRY = {
  id:                  '',
  name:                '',
  type:                DEFAULT_TYPE,
  triggers:            [],
  description:         '',
  lastModified:        null,
  ignoreLimitWarnings: { description: false, triggers: false },
  isPublic:            false,  // CharSnap visibility flag — mirrors CharSnap's private-by-default; round-trips through JSON import/export
  hiddenFromExport:    false,  // when true, entry remains in builder but is excluded from all export formats
  snapshots:           [], // [{ name, type, description, triggers, timestamp, label }]
};

export const DEFAULT_LOREBOOK = {
  id:              '',
  name:            'New Lorebook',
  entries:         [],
  allowedOverlaps: [], // lowercase trigger strings acknowledged as intentional overlaps
  rollback:        { enabled: false, snapshotCount: 3, autoSnapshot: true },
};

export const TEMPLATE_LOREBOOK = {
  id:   'template',
  name: 'Template Lorebook',
  entries: [
    {
      id:          'tpl-1',
      name:        'Character Name',
      type:        'character',
      triggers:    ['name', 'nickname', 'alias'],
      description: 'Enter a description of this character here.',
    },
    {
      id:          'tpl-2',
      name:        'Location Name',
      type:        'location',
      triggers:    ['place', 'location name'],
      description: 'Describe this location here.',
    },
  ],
};

// Sizing option sets surfaced by the footer's scaling menu.
//
// These lived as inline literals in three places before Phase 13A — the FAB
// pixel map in Hotbar.jsx, and the entry-header / window-size option lists in
// SettingsPanel.jsx. The scaling menu needs the same lists, so they moved here
// rather than being duplicated (architecture rule 7).

/** Pixel diameter for each named FAB size. `custom` reads fabCustomSize. */
export const FAB_SIZES = { small: 44, medium: 54, large: 64 };

export const FAB_SIZE_OPTIONS = [
  { value: 'small',  label: 'Small',  detail: '44px' },
  { value: 'medium', label: 'Medium', detail: '54px' },
  { value: 'large',  label: 'Large',  detail: '64px' },
  { value: 'custom', label: 'Custom' },
];

export const FAB_CUSTOM_MIN = 32;
export const FAB_CUSTOM_MAX = 100;

export const ENTRY_HEADER_SIZE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'medium',  label: 'Medium'  },
  { value: 'large',   label: 'Large'   },
];

/**
 * Named window sizes. `width: null` keeps the current width; `height:
 * 'viewport'` resolves to the live window.innerHeight at apply time, so "Full
 * height" means the same thing on any display.
 */
export const WINDOW_SIZE_PRESETS = [
  { id: 'small',  label: 'Small',       width: 480,  height: 600 },
  { id: 'medium', label: 'Medium',      width: 680,  height: 800 },
  { id: 'large',  label: 'Large',       width: 900,  height: 900 },
  { id: 'tall',   label: 'Full height', width: null, height: 'viewport' },
];

/**
 * A preset counts as the live size when the window is within this many pixels
 * of it. Applying a preset re-centres horizontally and clamps to the viewport,
 * so an exact comparison would drop the checkmark on a 1px rounding difference.
 */
export const WINDOW_PRESET_TOLERANCE = 2;

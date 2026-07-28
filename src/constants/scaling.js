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
  { id: 'small',  label: 'Small',       width: 800,  height: 700 },
  { id: 'medium', label: 'Medium',      width: 1200, height: 900, isDefault: true },
  { id: 'large',  label: 'Large',       width: 1600, height: 1000 },
  { id: 'tall',   label: 'Full height', width: null, height: 'viewport' },
];

/**
 * A preset counts as the live size when the window is within this many pixels
 * of it. Applying a preset re-centres horizontally and clamps to the viewport,
 * so an exact comparison would drop the checkmark on a 1px rounding difference.
 */
export const WINDOW_PRESET_TOLERANCE = 2;

/**
 * Hover grace for the sizing menu's flyouts. Without the open delay, dragging
 * the pointer diagonally toward a flyout unfurls every row it crosses; without
 * the close delay, the gap between a row and its flyout is enough to lose it.
 * Deliberately longer on close than open — same asymmetry the FAB quick-menu
 * uses (HOVER_OPEN_MS / HOVER_CLOSE_MS in Hotbar.jsx).
 */
export const FLYOUT_OPEN_MS  = 150;
export const FLYOUT_CLOSE_MS = 320;

/**
 * Hover grace for the ⤢ Size button itself. Hovering surfaces the menu and
 * moving away dismisses it, but a click pins it open until clicked again —
 * the way FabFilter's footer controls behave. The close delay has to cover the
 * gap between the button and the menu floating above it.
 */
export const SCALE_MENU_OPEN_MS  = 180;
export const SCALE_MENU_CLOSE_MS = 300;

/** Gap between a menu row and its flyout, and the viewport margin both respect. */
export const FLYOUT_GAP_PX      = 6;
export const FLYOUT_VIEWPORT_PAD = 8;

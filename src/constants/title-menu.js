// Geometry and timing for the lorebook title dropdown (WindowHeader → TitleMenu).
//
// The menu is portaled to document.body to escape the floating window's
// `overflow: hidden`, so every number here is viewport-space and applied in JS
// rather than CSS — see ScaleMenu.jsx for the same pattern.

// Preferred width. The menu clamps to the window's width when the window is
// narrower than this, so a 480px-wide build still gets a usable two-column menu.
export const TITLE_MENU_WIDTH_PX = 560;

// Below this the two columns stop fitting side by side and stack instead.
export const TITLE_MENU_STACK_BELOW_PX = 460;

// Never let the menu grow past this, however tall the viewport is — a dropdown
// that runs the full height of a large monitor reads as a page, not a menu.
export const TITLE_MENU_MAX_HEIGHT_PX = 430;

// Gap between the title field and the menu's top edge.
export const TITLE_MENU_GAP_PX = 7;

// Keep the menu clear of the viewport edges when the window sits near one.
export const TITLE_MENU_EDGE_PAD_PX = 8;

// Open/close transitions. Close runs longer than open so a menu dismissed by
// mistake is still visible long enough to notice — matches the scaling menu.
export const TITLE_MENU_OPEN_MS  = 160;
export const TITLE_MENU_CLOSE_MS = 280;

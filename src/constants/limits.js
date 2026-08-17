// Numeric caps: max trigger count (25), max lorebooks (10), char warning thresholds, char limit
export const MAX_TRIGGERS             = 25;
export const MAX_LOREBOOKS            = 50;
export const CHAR_LIMIT               = 1500;
export const CHAR_WARN_YELLOW         = 750;
export const CHAR_WARN_RED            = 1000;
export const TRIGGER_WARN_YELLOW      = 20;
export const TITLE_CHAR_LIMIT         = 50;  // advisory entry-title length cap (mirrors CharSnap; not enforced)
export const TITLE_WARN_YELLOW        = 40;  // title-length warning surfaces at this count
export const MIN_WINDOW_WIDTH         = 480;
export const MIN_WINDOW_HEIGHT        = 300;
export const MAX_HISTORY              = 50;
export const SUGGESTION_LIMIT         = 12;
export const SUGGESTION_DESC_WORD_LIMIT = 60;
export const THESAURUS_SENSE_CAP      = 5;   // max definitions shown in the cycle (with non-empty synonyms)
export const THESAURUS_LONG_PRESS_MS  = 450; // mobile long-press threshold to open the popover
export const THESAURUS_RELATED_MAX     = 50;  // words requested from Datamuse before PoS-grouping + frequency-trimming the "related" senses
export const THESAURUS_RELATED_MIN_FREQ = 0.5; // drop related words below this usage frequency (per million words); words with no frequency data are kept
export const THESAURUS_RELATED_PER_POS  = 12;  // cap on related words shown per part-of-speech group
export const DUPE_FLASH_MS            = 1500;
export const MENU_PANEL_WIDTH         = 320;
// The lorebook pull tab hangs off the OUTSIDE of the window's right edge, so
// the window can never occupy the last strip of the viewport — the tab needs
// that margin to live in. Same total footprint as reserving a gutter inside the
// frame; it just sits on the far side of the border, which is the point.
export const LOREBOOK_TAB_WIDTH_PX    = 30;
export function maxWindowWidth() {
  return Math.max(MIN_WINDOW_WIDTH, window.innerWidth - LOREBOOK_TAB_WIDTH_PX);
}
export const SAVE_STATUS_FRESH_MS     = 5000;  // status footer reads a plain "Saved" for this long after a write, then starts ageing
export const SAVE_STATUS_TICK_MS      = 30000; // how often the footer re-renders so "2m ago" ages without a save happening
export const ROLLBACK_SNAPSHOT_WARN   = 5;   // storage warning threshold in settings UI
export const ROLLBACK_MAX_CUSTOM      = 10;  // upper bound for custom snapshot count input
export const STORAGE_QUOTA_BYTES          = 5 * 1024 * 1024; // safe default (Safari floor); used when no profile is set
export const STORAGE_QUOTA_PROFILE_WEBKIT  = 'webkit';          // Safari + every iOS/iPadOS browser (WebKit-forced)
export const STORAGE_QUOTA_PROFILE_OTHER   = 'chromium-gecko';  // Chrome, Edge, Firefox, Brave, Opera, Samsung, Android WebView, …
export const STORAGE_QUOTA_BYTES_BY_PROFILE = {
  [STORAGE_QUOTA_PROFILE_WEBKIT]: 5  * 1024 * 1024,
  [STORAGE_QUOTA_PROFILE_OTHER]:  10 * 1024 * 1024,
};
export const STORAGE_WARN_THRESHOLD       = 0.60;
export const STORAGE_DANGER_THRESHOLD     = 0.85;

// Anchored-popover geometry (see hooks/use-anchored-position.js)
export const POPOVER_ANCHOR_GAP_PX = 6;  // breathing room between anchor and popover
export const POPOVER_EDGE_PAD_PX   = 8;  // keep the popover clear of the viewport edges

// Guided tour timings (see hooks/use-tour.js). The tour drives the real app, so
// each arrival step has to let React commit and any transition finish before the
// next one measures anything.
export const TOUR_STEP_SETTLE_MS    = 140;  // after each api action, before the next
export const TOUR_TARGET_TIMEOUT_MS = 2500; // give up waiting for a step's target
export const TOUR_SPOTLIGHT_PAD_PX  = 6;    // how far the spotlight ring sits outside its target
export const TOUR_BUBBLE_GAP_PX     = 14;   // clear air between the spotlight and the caption

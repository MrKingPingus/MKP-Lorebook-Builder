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
export const DUPE_FLASH_MS            = 1500;
export const MENU_PANEL_WIDTH         = 320;
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

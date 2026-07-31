// All localStorage key name strings — never hardcoded in logic files
export const LOREBOOK_INDEX_KEY = 'mkp_lorebook_index';
export const LOREBOOK_KEY_PREFIX = 'mkp_lorebook_';
export const SETTINGS_KEY = 'mkp_settings';
export const WINDOW_STATE_KEY = 'mkp_window_state';
// The id (dated heading) of the newest changelog release the user has been shown.
// Absent means they have never seen an update notice — which is either a returning
// user from before the feature existed, or a genuinely new user; see
// services/release-notes.js for how those are told apart.
export const LAST_SEEN_RELEASE_KEY = 'mkp_last_seen_release';

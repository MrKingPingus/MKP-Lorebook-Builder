// Host (embedded) mode — the builder running inside an iframe on CharSnap.
//
// Everything about the postMessage protocol that both sides have to agree on
// lives here: the query flag that turns host mode on, the origins the builder
// will talk to, the message names, and the limits the host enforces on save.
// The wire format itself is documented in HOST-MODE.md at the repo root; keep
// the two in step.

/** `?host=charsnap` on the iframe URL. Ignored at top level — see host-bridge. */
export const HOST_QUERY_PARAM = 'host';
export const HOST_QUERY_VALUE = 'charsnap';

/** Origins the builder accepts messages from and posts messages to. */
export const HOST_ORIGINS = [
  'https://charsnap.ai',
  'https://www.charsnap.ai',
  'http://localhost:3000',
];

export const HOST_PROTOCOL_VERSION = 1;

/** Message names. `type` sits at the top level of every envelope; every other
 *  field is flat beside it. */
export const HOST_MSG = {
  // iframe → host
  READY:         'mkp:ready',
  DIRTY:         'mkp:dirty',
  SAVE:          'mkp:save',
  REQUEST_LOAD:  'mkp:request-load',
  ERROR:         'mkp:error',
  // host → iframe
  LOAD:          'mkp:load',
  THEME:         'mkp:theme',
  SET_NAME:      'mkp:set-name',
  REQUEST_SAVE:  'mkp:request-save',
  SAVED:         'mkp:saved',
  SAVE_REJECTED: 'mkp:save-rejected',
  SAVE_FAILED:   'mkp:save-failed',
};

export const HOST_MSG_PREFIX = 'mkp:';

/** How long a posted `mkp:save` waits for a verdict before the button unlocks. */
export const HOST_SAVE_TIMEOUT_MS = 15000;
/** Debounce on the dirty-flag recompute — a keystroke burst posts once. */
export const HOST_DIRTY_DEBOUNCE_MS = 300;
/** After this long with no `mkp:load`, the connecting screen shows a hint. */
export const HOST_CONNECT_HINT_MS = 4000;

/** CharSnap's schema limits. The host rejects anything over these; the builder
 *  validates before posting and hard-caps typing so the rejection is rare. */
export const HOST_LIMITS = {
  name:         50,
  description:  1500,
  triggers:     25,
  lorebookName: 50,
};

/** `builderMeta.version` the builder writes and the only one it reads. */
export const HOST_META_VERSION = 1;

/** Upper bound on a single inbound payload's JSON size — a sanity cap, not a
 *  schema limit. Anything larger is refused with `mkp:error`. */
export const HOST_MAX_PAYLOAD_CHARS = 4 * 1024 * 1024;

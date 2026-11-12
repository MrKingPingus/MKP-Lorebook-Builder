// The postMessage seam between the builder and a CharSnap host page.
//
// Plain service: it knows about `window`, the allowlisted origins and the
// envelope shape, and nothing about lorebooks. Origin handling is the whole
// point of this file — every inbound message is checked against the allowlist
// AND against `event.source === window.parent`, and every outbound message
// names an explicit target origin. Nothing here ever posts to `'*'`.
import {
  HOST_QUERY_PARAM,
  HOST_QUERY_VALUE,
  HOST_ORIGINS,
  HOST_MSG_PREFIX,
} from '../constants/host.js';

/** True only when the page was opened as an iframe with `?host=charsnap`.
 *  Both halves are required: the flag alone at top level shows the normal
 *  standalone app, so a shared or bookmarked iframe URL is harmless. */
export function detectHostMode(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return false;
  let params;
  try {
    params = new URLSearchParams(win.location?.search ?? '');
  } catch {
    return false;
  }
  if (params.get(HOST_QUERY_PARAM) !== HOST_QUERY_VALUE) return false;
  try {
    return win.parent !== win;
  } catch {
    // Accessing `parent` can throw in exotic sandboxes; treat as not embedded.
    return false;
  }
}

/** Parse an origin out of a URL string, or null. */
function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Best guess at the host's origin before it has said anything.
 *  Chrome/Safari expose `location.ancestorOrigins`; Firefox does not, so fall
 *  back to the referrer. Either has to be on the allowlist to count. Returns
 *  null when nothing usable is available — the caller then broadcasts to the
 *  allowlist and locks onto whichever origin answers. */
export function resolveHostOrigin(win = typeof window !== 'undefined' ? window : null) {
  if (!win) return null;
  const ancestors = win.location?.ancestorOrigins;
  if (ancestors && ancestors.length > 0) {
    const parent = ancestors[0];
    if (HOST_ORIGINS.includes(parent)) return parent;
  }
  const ref = originOf(win.document?.referrer ?? '');
  if (ref && HOST_ORIGINS.includes(ref)) return ref;
  return null;
}

/** Post one message to the host. With a known origin the message goes to that
 *  origin only; without one it is posted once per allowlisted origin, and the
 *  browser delivers it only where the parent's origin actually matches. */
export function postToHost(message, origin, win = typeof window !== 'undefined' ? window : null) {
  if (!win || !message || typeof message.type !== 'string') return false;
  let target;
  try {
    target = win.parent;
  } catch {
    return false;
  }
  if (!target || target === win) return false;
  const targets = origin ? [origin] : HOST_ORIGINS;
  for (const o of targets) {
    try {
      target.postMessage(message, o);
    } catch {
      // A mismatched targetOrigin is dropped silently by the browser; a thrown
      // error here means a malformed origin string, which the allowlist rules out.
    }
  }
  return true;
}

/** Is this `message` event one the builder should act on?
 *  `lockedOrigin` narrows the allowlist to a single origin once the host has
 *  identified itself. Pure, so it can be checked without a browser. */
export function isHostMessage(event, lockedOrigin, win = typeof window !== 'undefined' ? window : null) {
  if (!event) return false;
  if (typeof event.origin !== 'string') return false;
  if (lockedOrigin ? event.origin !== lockedOrigin : !HOST_ORIGINS.includes(event.origin)) return false;
  if (win) {
    let parent;
    try {
      parent = win.parent;
    } catch {
      return false;
    }
    if (event.source !== parent) return false;
  }
  const data = event.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (typeof data.type !== 'string' || !data.type.startsWith(HOST_MSG_PREFIX)) return false;
  return true;
}

/** Subscribe to host messages. `handler(data, origin)` receives only messages
 *  that pass `isHostMessage`. `getOrigin()` supplies the currently locked
 *  origin (or null); `onOrigin(origin)` is called the first time a valid
 *  message arrives so the caller can lock onto it. Returns an unsubscribe. */
export function subscribeToHost(handler, { getOrigin, onOrigin } = {}, win = typeof window !== 'undefined' ? window : null) {
  if (!win) return () => {};
  function onMessage(event) {
    const locked = getOrigin ? getOrigin() : null;
    if (!isHostMessage(event, locked, win)) return;
    if (!locked && onOrigin) onOrigin(event.origin);
    handler(event.data, event.origin);
  }
  win.addEventListener('message', onMessage);
  return () => win.removeEventListener('message', onMessage);
}

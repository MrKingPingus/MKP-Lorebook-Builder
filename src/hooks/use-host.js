// Host-mode orchestrator. Mounted once in App, right after bootstrap, and only
// does anything when host-store.enabled is set (main.jsx decides that from the
// URL). Owns the whole conversation with CharSnap:
//
//   mkp:ready         → announced once the message listener is up
//   mkp:load          → find / create / reconcile the local draft (see loadBook)
//   mkp:theme         → push the host's palette through use-theme, never persisted
//   mkp:set-name      → the host owns the name; apply it
//   mkp:request-save  → same as the Save button
//   mkp:saved         → stamp the draft as synced with the hash captured at post time
//   mkp:save-rejected → show the host's error list, focus the first entry
//   mkp:save-failed   → conflict dialog, or a notice
//
// Drafts persist in localStorage exactly like standalone books, with four extra
// fields on host-bound books only: hostId, hostPending, hostSyncedAt,
// hostSyncedHash. "Dirty" is content hash ≠ hostSyncedHash — a real content
// comparison, not a flag, so an edit that is undone reads as clean again.
import { useEffect, useRef, useCallback } from 'react';
import { useHostStore }     from '../state/host-store.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { useSettingsStore } from '../state/settings-store.js';
import { useHostBridge }    from './use-host-bridge.js';
import { reducedMotionScrollBehavior } from './use-accessibility.js';
import { removeItem, saveLorebook, saveLorebookIndex } from '../services/storage-service.js';
import { createEmptyLorebook } from '../services/entry-factory.js';
import { addToIndex, promoteInIndex, evictOldestHostDraft } from '../services/lorebook-index.js';
import { toHostPayload, fromHostPayload, contentHash } from '../services/host-serialize.js';
import { validateForHost } from '../services/host-limits.js';
import { CUSTOM_CORE_TOKENS } from '../constants/themes.js';
import { APP_VERSION } from '../constants/version.js';
import { LOREBOOK_KEY_PREFIX } from '../constants/storage-keys.js';
import { MOBILE_BREAKPOINT_PX } from '../constants/viewport.js';
import {
  HOST_MSG,
  HOST_PROTOCOL_VERSION,
  HOST_SAVE_TIMEOUT_MS,
  HOST_DIRTY_DEBOUNCE_MS,
} from '../constants/host.js';

// ── component-facing selectors ───────────────────────────────────────────────

/** True when the builder is embedded in CharSnap. The one flag most of the UI
 *  branches on; components import this rather than the store. */
export function useHostMode() {
  return useHostStore((s) => s.enabled);
}

/** Read any host-store field. Components use this instead of the store. */
export function useHostState(selector) {
  return useHostStore(selector);
}

// ── pure helpers over the stores ─────────────────────────────────────────────

function allBooks() {
  return Object.values(useLorebookStore.getState().lorebooks);
}

function findByHostId(hostId) {
  return allBooks().find((lb) => lb.hostId != null && String(lb.hostId) === hostId) ?? null;
}

/** A host-bound draft whose content matches what the host last confirmed. */
function isClean(lb) {
  return !!lb && lb.hostSyncedHash != null && contentHash(lb) === lb.hostSyncedHash;
}

/** Does the host's copy post-date the one this draft was synced from? */
function serverNewer(lb, updatedAt) {
  if (!updatedAt) return false;
  if (!lb.hostSyncedAt) return true;
  const a = Date.parse(updatedAt);
  const b = Date.parse(lb.hostSyncedAt);
  if (Number.isNaN(a) || Number.isNaN(b)) return updatedAt !== lb.hostSyncedAt;
  return a > b;
}

/** A fresh local book from a parsed mkp:load, already stamped as synced. */
function buildHostBook(parsed, { hostId, updatedAt, pending }) {
  const rollbackDefaultEnabled = useSettingsStore.getState().rollbackDefaultEnabled;
  const lb = createEmptyLorebook({
    ...(rollbackDefaultEnabled ? { rollback: { enabled: true, snapshotCount: 3 } } : {}),
    name:            parsed.name,
    entries:         parsed.entries,
    folders:         parsed.folders,
    allowedOverlaps: parsed.allowedOverlaps,
    hostId,
    hostPending:     pending,
    hostSyncedAt:    updatedAt ?? null,
  });
  lb.hostSyncedHash = contentHash(lb);
  return lb;
}

/** Overwrite a local draft's content with the host's copy and mark it synced. */
function replaceContent(id, parsed) {
  const store = useLorebookStore.getState();
  const current = store.lorebooks[id];
  if (!current) return;
  const next = {
    ...current,
    name:            parsed.name,
    entries:         parsed.entries,
    folders:         parsed.folders,
    allowedOverlaps: parsed.allowedOverlaps,
    hostSyncedAt:    parsed.updatedAt ?? null,
  };
  next.hostSyncedHash = contentHash(next);
  store.patchLorebook(id, next);
  useHistoryStore.getState().clear();
  persistBook(next);
}

function deleteBook(id) {
  removeItem(LOREBOOK_KEY_PREFIX + id);
  useLorebookStore.getState().removeLorebook(id);
  saveLorebookIndex(useLorebookStore.getState().lorebookIndex);
}

/** Drop the oldest clean host draft that is not `keepId`. Returns true if one went. */
function evictOne(keepId) {
  const state = useLorebookStore.getState();
  const victim = evictOldestHostDraft(state.lorebookIndex, (id) =>
    id !== keepId && id !== state.activeLorebookId && isClean(state.lorebooks[id]));
  if (!victim) return false;
  deleteBook(victim);
  return true;
}

/** Mark a draft as living in memory only, after storage refused it. */
function goEphemeral(id) {
  const store = useLorebookStore.getState();
  store.patchLorebook(id, { ephemeral: true });
  store.setLorebookIndex(store.lorebookIndex.map((item) =>
    item.id === id ? { ...item, ephemeral: true } : item));
  saveLorebookIndex(useLorebookStore.getState().lorebookIndex);
  const host = useHostStore.getState();
  host.setEphemeral(true);
  host.setNotice('Browser storage is full — this draft is not being saved locally. Save to CharSnap to keep it.');
}

/** Write a host draft to localStorage, making room by evicting clean host
 *  drafts if the quota is hit. Returns false if it still would not fit. */
function persistBook(lb) {
  if (!lb || lb.ephemeral) return true;
  if (saveLorebook(lb)) return true;
  for (let i = 0; i < 8; i++) {
    if (!evictOne(lb.id)) break;
    if (saveLorebook(lb)) return true;
  }
  return false;
}

/** Make `lb` the active book — mirrors switchLorebook's resets — adding it to
 *  the index (evicting an old clean draft, or falling back to ephemeral, when
 *  the index or storage is full) and persisting it. */
function activate(lb) {
  const store = useLorebookStore.getState();
  let book = lb;
  let index = store.lorebookIndex;

  if (!store.lorebooks[book.id]) store.setLorebook(book);

  if (index.some((item) => item.id === book.id)) {
    index = promoteInIndex(index, book.id);
  } else {
    let next = addToIndex(index, book);
    if (!next && evictOne(book.id)) next = addToIndex(useLorebookStore.getState().lorebookIndex, book);
    if (!next) {
      book = { ...book, ephemeral: true };
      store.setLorebook(book);
      next = addToIndex(useLorebookStore.getState().lorebookIndex, book);
      const host = useHostStore.getState();
      host.setEphemeral(true);
      host.setNotice('Too many saved lorebooks — this draft is not being saved locally. Save to CharSnap to keep it.');
    }
    index = next;
  }

  store.setLorebookIndex(index);
  store.setActiveLorebookId(book.id);
  if (!persistBook(book)) goEphemeral(book.id);
  saveLorebookIndex(useLorebookStore.getState().lorebookIndex);

  useHistoryStore.getState().clear();
  const ui = useUiStore.getState();
  ui.clearSelection();
  ui.setSearchQuery('');
  ui.setSearchMode('search');
  ui.setTypeFilter([]);
}

/** Accept only the seven core tokens, and only as hex colours (#rgb, #rgba,
 *  #rrggbb, #rrggbbaa). The values go through style.setProperty, so this is
 *  hygiene rather than a security boundary — but a host bug should not be
 *  able to paint garbage, and the custom-theme contrast readout only
 *  understands hex anyway. Anything else is dropped, token by token. */
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function sanitizeTokens(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const t of CUSTOM_CORE_TOKENS) {
    const v = raw[t.var];
    if (typeof v !== 'string') continue;
    const s = v.trim();
    if (!HEX_COLOR.test(s)) continue;
    out[t.var] = s;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function sanitizeErrors(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      index:   Number.isInteger(e.index) ? e.index : -1,
      field:   typeof e.field === 'string' ? e.field : '',
      message: typeof e.message === 'string' ? e.message : 'Invalid',
    }))
    .slice(0, 200);
}

/** Bring the offending entry on screen: expand it on desktop (the same
 *  search-focus override SearchBar uses), open it in the detail panel on mobile. */
function focusError(err) {
  if (!err || !Number.isInteger(err.index) || err.index < 0) return;
  const lb = useLorebookStore.getState().getActiveLorebook();
  const entry = lb?.entries?.[err.index];
  if (!entry) return;
  const ui = useUiStore.getState();
  // Filters could be hiding it; a focus that lands on nothing is worse than none.
  ui.setSearchQuery('');
  ui.setSearchMode('search');
  ui.setTypeFilter([]);
  ui.setFolderFilter([]);
  if (typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX) {
    ui.setActiveEntryId(entry.id);
    return;
  }
  ui.setSearchFocusedId(entry.id);
  requestAnimationFrame(() => {
    document.getElementById(`entry-${entry.id}`)?.scrollIntoView({ behavior: reducedMotionScrollBehavior(), block: 'nearest' });
  });
}

// mkp:ready goes out once per page load, not once per effect run — React's
// StrictMode mounts effects twice in development.
let announced = false;

// ── the orchestrator ─────────────────────────────────────────────────────────

export function useHost() {
  const enabled = useHostStore((s) => s.enabled);

  const saveTimer   = useRef(null);
  const pendingSave = useRef(null);   // { localId, hash } for the mkp:save in flight
  const dirtyCtl    = useRef({ flush: () => {}, reset: () => {} });

  const handlerRef = useRef(null);
  const { post } = useHostBridge((data) => handlerRef.current?.(data));

  const clearSaveTimer = () => {
    clearTimeout(saveTimer.current);
    saveTimer.current = null;
  };

  // Post the dirty flag now, whether or not it changed.
  const announceDirty = useCallback(() => {
    dirtyCtl.current.reset();
    dirtyCtl.current.flush();
  }, []);

  const saveToHost = useCallback(({ force = false } = {}) => {
    const host = useHostStore.getState();
    if (!host.enabled || !host.loaded || host.saving) return;
    const lb = useLorebookStore.getState().getActiveLorebook();
    if (!lb) return;

    const errors = validateForHost(lb);
    if (errors.length > 0) {
      host.setSaveErrors(errors);
      focusError(errors.find((e) => e.index >= 0));
      return;
    }

    host.setSaveErrors([]);
    host.setConflict(null);
    host.setNotice(null);
    pendingSave.current = { localId: lb.id, hash: contentHash(lb) };
    host.setSaving(true);
    post(HOST_MSG.SAVE, { ...toHostPayload(lb), ...(force ? { force: true } : {}) });

    clearSaveTimer();
    saveTimer.current = setTimeout(() => {
      const h = useHostStore.getState();
      if (!h.saving) return;
      pendingSave.current = null;
      h.setSaving(false);
      h.setNotice('CharSnap did not confirm the save. Check the page and try again.');
    }, HOST_SAVE_TIMEOUT_MS);
  }, [post]);

  const resolveConflict = useCallback((choice) => {
    const host = useHostStore.getState();
    const c = host.conflict;
    if (!c) return;
    switch (c.kind) {
      case 'load':
        if (choice === 'use-host') replaceContent(c.localId, c.parsed);
        break;
      case 'load-pending':
        if (choice === 'discard') {
          activate(buildHostBook(c.parsed, { hostId: null, updatedAt: null, pending: true }));
          deleteBook(c.localId);
        }
        break;
      case 'save':
        if (choice === 'overwrite') {
          host.setConflict(null);
          saveToHost({ force: true });
          return;
        }
        if (choice === 'reload') {
          // The builder cannot fetch from CharSnap itself: ask the host for a
          // fresh mkp:load. It arrives with the newer updatedAt, the local
          // draft is dirty, and the load reconciliation offers "resume draft /
          // use CharSnap's version".
          host.setConflict(null);
          post(HOST_MSG.REQUEST_LOAD, {});
          return;
        }
        break;
      default:
        break;
    }
    host.setConflict(null);
    announceDirty();
  }, [saveToHost, announceDirty, post]);

  // Message semantics. Kept in a ref so the bridge subscription never re-runs.
  handlerRef.current = (data) => {
    const host = useHostStore.getState();
    switch (data.type) {
      case HOST_MSG.LOAD: {
        const parsed = fromHostPayload(data);
        if (!parsed.ok) {
          post(HOST_MSG.ERROR, { message: `mkp:load rejected: ${parsed.error}` });
          return;
        }
        clearSaveTimer();
        pendingSave.current = null;
        host.setSaving(false);
        host.setSaveErrors([]);
        host.setConflict(null);

        if (parsed.hostId != null) {
          const local = findByHostId(parsed.hostId);
          if (!local) {
            activate(buildHostBook(parsed, { hostId: parsed.hostId, updatedAt: parsed.updatedAt, pending: false }));
          } else {
            const localDirty = !isClean(local);
            const newer = serverNewer(local, parsed.updatedAt);
            if (!localDirty) {
              // Clean: take the host's copy if it moved on, else keep ours —
              // which keeps the checkpoints and undo-free draft exactly as left.
              if (newer) replaceContent(local.id, parsed);
              activate(useLorebookStore.getState().lorebooks[local.id]);
            } else if (!newer) {
              activate(local); // resume the draft silently
            } else {
              activate(local);
              host.setConflict({
                kind: 'load', localId: local.id, parsed,
                name: local.name, updatedAt: parsed.updatedAt,
              });
            }
          }
        } else {
          // A book CharSnap has not created yet. Offer a leftover unsaved draft
          // of one before starting another.
          const pendingDrafts = allBooks().filter((lb) => lb.hostPending === true && lb.hostId == null);
          const pending = pendingDrafts.find((lb) => (lb.entries?.length ?? 0) > 0);
          // An empty pending draft has nothing worth asking about, but it also
          // has no hostId, so eviction would never reclaim it: reuse it rather
          // than leaving one behind for every "new lorebook" the host opens.
          const blank = pending ? null : pendingDrafts[0];
          if (pending) {
            activate(pending);
            host.setConflict({
              kind: 'load-pending', localId: pending.id, parsed,
              name: pending.name, count: pending.entries.length,
            });
          } else if (blank) {
            replaceContent(blank.id, parsed);
            activate(useLorebookStore.getState().lorebooks[blank.id]);
          } else {
            activate(buildHostBook(parsed, { hostId: null, updatedAt: null, pending: true }));
          }
        }
        host.setLoaded(true);
        announceDirty();
        return;
      }

      case HOST_MSG.THEME: {
        const tokens = sanitizeTokens(data.tokens);
        if (tokens) host.setThemeTokens(tokens);
        return;
      }

      case HOST_MSG.SET_NAME: {
        if (typeof data.name !== 'string') return;
        useLorebookStore.getState().updateActiveName(data.name);
        return;
      }

      case HOST_MSG.REQUEST_SAVE:
        saveToHost();
        return;

      case HOST_MSG.SAVED: {
        clearSaveTimer();
        const p = pendingSave.current;
        pendingSave.current = null;
        host.setSaving(false);
        if (!p) return;
        const store = useLorebookStore.getState();
        const current = store.lorebooks[p.localId];
        if (!current) return;
        const hostId = data.hostId == null ? (current.hostId ?? null) : String(data.hostId);
        store.patchLorebook(p.localId, {
          hostId,
          hostPending:    false,
          hostSyncedAt:   typeof data.updatedAt === 'string' ? data.updatedAt : null,
          hostSyncedHash: p.hash,
        });
        persistBook(useLorebookStore.getState().lorebooks[p.localId]);
        saveLorebookIndex(useLorebookStore.getState().lorebookIndex);
        host.setSaveErrors([]);
        host.setLastSavedAt(Date.now());
        announceDirty();
        return;
      }

      case HOST_MSG.SAVE_REJECTED: {
        clearSaveTimer();
        pendingSave.current = null;
        host.setSaving(false);
        const errors = sanitizeErrors(data.errors);
        host.setSaveErrors(errors);
        focusError(errors.find((e) => e.index >= 0));
        return;
      }

      case HOST_MSG.SAVE_FAILED: {
        clearSaveTimer();
        pendingSave.current = null;
        host.setSaving(false);
        const message = typeof data.message === 'string' ? data.message : '';
        if (data.reason === 'conflict') {
          host.setConflict({ kind: 'save', message });
        } else {
          host.setNotice(message || 'CharSnap could not save the lorebook.');
        }
        return;
      }

      default:
        // Unknown mkp:* message — a newer host talking to an older builder. Ignore.
    }
  };

  // Bind the actions components reach through the store.
  useEffect(() => {
    if (!enabled) return undefined;
    useHostStore.getState().bindActions({ saveToHost, resolveConflict, focusError });
    return () => useHostStore.getState().bindActions({ saveToHost: null, resolveConflict: null, focusError: null });
  }, [enabled, saveToHost, resolveConflict]);

  // Dirty tracking: recompute on any lorebook-store change, debounced, and post
  // mkp:dirty only when the flag actually flips.
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let lastPosted = null;
    const compute = () => {
      const host = useHostStore.getState();
      if (!host.loaded) return;
      const lb = useLorebookStore.getState().getActiveLorebook();
      if (!lb) return;
      const dirty = !isClean(lb);
      if (host.dirty !== dirty) host.setDirty(dirty);
      if (dirty !== lastPosted) {
        lastPosted = dirty;
        post(HOST_MSG.DIRTY, { dirty });
      }
    };
    dirtyCtl.current = {
      flush: () => { clearTimeout(timer); compute(); },
      reset: () => { lastPosted = null; },
    };
    const unsubscribe = useLorebookStore.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(compute, HOST_DIRTY_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      dirtyCtl.current = { flush: () => {}, reset: () => {} };
    };
  }, [enabled, post]);

  // Handshake. The bridge's listener effect is declared inside useHostBridge,
  // which runs before this effect, so the host's reply cannot arrive first.
  useEffect(() => {
    if (!enabled || announced) return undefined;
    announced = true;
    post(HOST_MSG.READY, { protocolVersion: HOST_PROTOCOL_VERSION, appVersion: APP_VERSION });
    return undefined;
  }, [enabled, post]);

  // The save timeout must not outlive the orchestrator. Its own effect, not the
  // handshake's cleanup: StrictMode re-runs the handshake effect after
  // `announced` is set, and the second run registers no cleanup.
  useEffect(() => () => clearSaveTimer(), []);
}

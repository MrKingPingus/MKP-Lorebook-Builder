// Isolated read/write interface to localStorage — the only file that touches it directly
import { LOREBOOK_KEY_PREFIX, LOREBOOK_INDEX_KEY, SETTINGS_KEY, WINDOW_STATE_KEY } from '../constants/storage-keys.js';
import { STORAGE_QUOTA_FALLBACK_BYTES } from '../constants/limits.js';

const KEY_PREFIX = 'mkp_';
const UTF16_BYTES_PER_CHAR = 2; // localStorage strings are stored as UTF-16

const listeners = new Set();
function notify() {
  for (const fn of listeners) fn();
}

export function subscribeToWrites(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify();
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    notify();
  } catch {
    // ignore
  }
}

function utf16Bytes(str) {
  return str ? str.length * UTF16_BYTES_PER_CHAR : 0;
}

/**
 * Walk every mkp_* localStorage key and sum bytes per category. The caller supplies
 * `measureLorebook(parsedLorebook)` so this service stays schema-agnostic — it returns
 * `{ snapshots }` representing the snapshot-attributable bytes within the parsed value.
 *
 * Returns: { totalBytes, breakdown: { snapshots, entryContent, index, settings, windowState } }
 */
export function getStorageBreakdown({ measureLorebook }) {
  let snapshots     = 0;
  let entryContent  = 0;
  let index         = 0;
  let settings      = 0;
  let windowState   = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(KEY_PREFIX)) continue;
    const value = localStorage.getItem(key) ?? '';
    const bytes = utf16Bytes(key) + utf16Bytes(value);

    if (key === LOREBOOK_INDEX_KEY) {
      index += bytes;
    } else if (key === SETTINGS_KEY) {
      settings += bytes;
    } else if (key === WINDOW_STATE_KEY) {
      windowState += bytes;
    } else if (key.startsWith(LOREBOOK_KEY_PREFIX)) {
      let snapshotBytes = 0;
      if (measureLorebook) {
        try {
          const parsed = JSON.parse(value);
          const result = measureLorebook(parsed);
          snapshotBytes = (result?.snapshots ?? 0) * UTF16_BYTES_PER_CHAR;
        } catch {
          snapshotBytes = 0;
        }
      }
      // Cap at bytes to guard against measurement drift
      snapshotBytes = Math.min(snapshotBytes, bytes);
      snapshots    += snapshotBytes;
      entryContent += bytes - snapshotBytes;
    }
  }

  return {
    totalBytes: snapshots + entryContent + index + settings + windowState,
    breakdown: { snapshots, entryContent, index, settings, windowState },
  };
}

/** Resolve the browser's reported per-origin quota, or the Safari-floor fallback. */
export async function getStorageQuota() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const { quota } = await navigator.storage.estimate();
      if (typeof quota === 'number' && quota > 0) return quota;
    }
  } catch {
    // fall through
  }
  return STORAGE_QUOTA_FALLBACK_BYTES;
}

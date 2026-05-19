// Isolated read/write interface to localStorage — the only file that touches it directly
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { LOREBOOK_KEY_PREFIX, LOREBOOK_INDEX_KEY, SETTINGS_KEY, WINDOW_STATE_KEY } from '../constants/storage-keys.js';
import { STORAGE_QUOTA_BYTES } from '../constants/limits.js';

const KEY_PREFIX = 'mkp_';
const UTF16_BYTES_PER_CHAR = 2; // localStorage strings are stored as UTF-16
const COMPRESSION_PREFIX = 'LZ1:'; // marker for lz-string UTF-16 compressed blobs; absent on legacy plain-JSON values

const listeners = new Set();
function notify() {
  for (const fn of listeners) fn();
}

export function subscribeToWrites(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Decode a stored string in either compressed (LZ1:…) or legacy plain-JSON form.
// Returns null on any failure so callers can decide how to recover.
function decodeStored(raw) {
  if (typeof raw !== 'string') return null;
  try {
    if (raw.startsWith(COMPRESSION_PREFIX)) {
      const json = decompressFromUTF16(raw.slice(COMPRESSION_PREFIX.length));
      return json === null ? null : JSON.parse(json);
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readJson(key, fallback = null) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  const decoded = decodeStored(raw);
  return decoded === null ? fallback : decoded;
}

export function writeJson(key, value) {
  try {
    const json = JSON.stringify(value);
    const encoded = COMPRESSION_PREFIX + compressToUTF16(json);
    localStorage.setItem(key, encoded);
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
 * `{ snapshots, total }` where both are character counts of the *uncompressed* lorebook;
 * the ratio is applied to the actual (possibly compressed) localStorage cost so the
 * breakdown reflects real on-disk usage.
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
        const parsed = decodeStored(value);
        if (parsed) {
          const { snapshots: snapChars = 0, total: totalChars = 0 } = measureLorebook(parsed) ?? {};
          const ratio = totalChars > 0 ? Math.min(1, snapChars / totalChars) : 0;
          snapshotBytes = Math.round(bytes * ratio);
        }
      }
      snapshots    += snapshotBytes;
      entryContent += bytes - snapshotBytes;
    }
  }

  return {
    totalBytes: snapshots + entryContent + index + settings + windowState,
    breakdown: { snapshots, entryContent, index, settings, windowState },
  };
}

// The localStorage cap is a per-API limit (~5 MB on Safari, ~10 MB on Chrome/Firefox)
// and is NOT the same as `navigator.storage.estimate().quota`, which reports the entire
// origin storage budget (IndexedDB + Cache + localStorage + …) and is typically gigabytes.
// We report against the conservative Safari floor so warnings fire on the tightest browser.
export function getStorageQuota() {
  return STORAGE_QUOTA_BYTES;
}

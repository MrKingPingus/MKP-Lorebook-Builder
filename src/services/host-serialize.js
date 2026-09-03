// Wire ⇄ builder mapping for host mode, plus the content hash that decides
// whether a draft is dirty.
//
// Deliberately NOT routed through json-import.js's `importFromJson`: that path
// is for files of unknown provenance and runs `unescape-import.js`, which
// rewrites backslashes in text. A lorebook coming from CharSnap is the user's
// own saved data and must come back byte-for-byte, so this mapper copies
// strings as they are and only borrows the type-id normaliser.
import { TYPE_LABEL }    from './json-export.js';
import { normalizeType } from './json-import.js';
import { createEmptyEntry } from './entry-factory.js';
import { DEFAULT_FOLDER }   from '../constants/defaults.js';
import { HOST_META_VERSION, HOST_MAX_PAYLOAD_CHARS } from '../constants/host.js';

// ── outbound ─────────────────────────────────────────────────────────────────

/** The `mkp:save` body for a lorebook: every entry (hidden ones included, as
 *  `disabled: true`) in current order, plus the builder-only layer as
 *  `builderMeta`. `hostId` is null for a book CharSnap has not created yet. */
export function toHostPayload(lorebook) {
  const entries = (lorebook?.entries ?? []).map((e) => ({
    name:        typeof e.name === 'string' ? e.name : '',
    triggers:    Array.isArray(e.triggers) ? e.triggers.filter((t) => typeof t === 'string') : [],
    description: typeof e.description === 'string' ? e.description : '',
    entryType:   TYPE_LABEL[e.type] ?? TYPE_LABEL[normalizeType(e.type)],
    isPublic:    e.isPublic === true,
    disabled:    e.hiddenFromExport === true,
  }));

  const folders = (lorebook?.folders ?? []).map((f) => ({
    id:            String(f.id),
    name:          typeof f.name === 'string' ? f.name : DEFAULT_FOLDER.name,
    color:         typeof f.color === 'string' ? f.color : DEFAULT_FOLDER.color,
    parentId:      f.parentId == null ? null : String(f.parentId),
    collapseState: typeof f.collapseState === 'string' ? f.collapseState : DEFAULT_FOLDER.collapseState,
    order:         Number.isFinite(f.order) ? f.order : DEFAULT_FOLDER.order,
  }));

  const entryMeta = (lorebook?.entries ?? []).map((e) => ({
    folderId: e.folderId == null ? null : String(e.folderId),
  }));

  return {
    hostId: lorebook?.hostId == null ? null : String(lorebook.hostId),
    name:   typeof lorebook?.name === 'string' ? lorebook.name : '',
    entries,
    builderMeta: {
      version:         HOST_META_VERSION,
      folders,
      entryMeta,
      allowedOverlaps: (lorebook?.allowedOverlaps ?? []).filter((s) => typeof s === 'string'),
    },
  };
}

// ── inbound ──────────────────────────────────────────────────────────────────

function fail(error) {
  return { ok: false, error };
}

function optionalString(value, label) {
  if (value == null) return { value: '' };
  if (typeof value !== 'string') return { error: `${label} must be a string` };
  return { value };
}

/** Map an `mkp:load` payload into builder shape. Returns
 *  `{ ok: true, hostId, name, updatedAt, entries, folders, allowedOverlaps }`
 *  or `{ ok: false, error }` for anything malformed. Text is copied verbatim.
 *  Tolerates `builderMeta: null` and an `entryMeta` whose length does not match
 *  the entry list (the host sends `[]` when the classic editor changed the
 *  entry count) — folders survive, placements are dropped. */
export function fromHostPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return fail('payload is not an object');
  }
  try {
    if (JSON.stringify(payload).length > HOST_MAX_PAYLOAD_CHARS) return fail('payload too large');
  } catch {
    return fail('payload is not serialisable');
  }

  const hostId = payload.hostId == null ? null : String(payload.hostId);

  const nameRes = optionalString(payload.name, 'name');
  if (nameRes.error) return fail(nameRes.error);

  let updatedAt = null;
  if (payload.updatedAt != null) {
    if (typeof payload.updatedAt !== 'string') return fail('updatedAt must be an ISO string or null');
    updatedAt = payload.updatedAt;
  }

  const rawEntries = payload.entries == null ? [] : payload.entries;
  if (!Array.isArray(rawEntries)) return fail('entries must be an array');

  const entries = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const raw = rawEntries[i];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(`entries[${i}] is not an object`);

    const name = optionalString(raw.name, `entries[${i}].name`);
    if (name.error) return fail(name.error);
    const description = optionalString(raw.description, `entries[${i}].description`);
    if (description.error) return fail(description.error);

    let triggers = [];
    if (raw.triggers != null) {
      if (!Array.isArray(raw.triggers)) return fail(`entries[${i}].triggers must be an array`);
      for (let t = 0; t < raw.triggers.length; t++) {
        if (typeof raw.triggers[t] !== 'string') return fail(`entries[${i}].triggers[${t}] must be a string`);
      }
      triggers = [...raw.triggers];
    }

    entries.push(createEmptyEntry({
      name:             name.value,
      type:             normalizeType(raw.entryType),
      triggers,
      description:      description.value,
      isPublic:         raw.isPublic === true,
      hiddenFromExport: raw.disabled === true,
      folderId:         null,
    }));
  }

  let folders = [];
  let allowedOverlaps = [];
  const meta = payload.builderMeta;
  if (meta != null) {
    if (typeof meta !== 'object' || Array.isArray(meta)) return fail('builderMeta must be an object or null');
    if (meta.version === HOST_META_VERSION) {
      if (Array.isArray(meta.folders)) {
        folders = meta.folders
          .filter((f) => f && typeof f === 'object' && f.id != null && String(f.id) !== '')
          .map((f) => ({
            ...DEFAULT_FOLDER,
            id:            String(f.id),
            name:          typeof f.name === 'string' ? f.name : DEFAULT_FOLDER.name,
            color:         typeof f.color === 'string' ? f.color : DEFAULT_FOLDER.color,
            parentId:      f.parentId == null ? null : String(f.parentId),
            collapseState: typeof f.collapseState === 'string' ? f.collapseState : DEFAULT_FOLDER.collapseState,
            order:         Number.isFinite(f.order) ? f.order : DEFAULT_FOLDER.order,
          }));
      }
      if (Array.isArray(meta.entryMeta) && meta.entryMeta.length === entries.length) {
        const known = new Set(folders.map((f) => f.id));
        meta.entryMeta.forEach((m, i) => {
          const folderId = m && typeof m === 'object' && m.folderId != null ? String(m.folderId) : null;
          // A folderId with no folder would render top-level anyway; drop it so
          // the hash does not carry a placement nobody can see.
          entries[i].folderId = folderId && known.has(folderId) ? folderId : null;
        });
      }
      if (Array.isArray(meta.allowedOverlaps)) {
        allowedOverlaps = meta.allowedOverlaps.filter((s) => typeof s === 'string');
      }
    }
  }

  return { ok: true, hostId, name: nameRes.value, updatedAt, entries, folders, allowedOverlaps };
}

// ── content hash ─────────────────────────────────────────────────────────────

// cyrb53 — a small, fast, well-distributed 53-bit string hash. Not
// cryptographic and does not need to be: it only has to tell "same content"
// from "different content" for one user's own drafts.
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Canonical projection of what a save would send: name, every entry's saved
 *  fields in order (including its folder placement), the folders minus their
 *  collapse state, and the acknowledged overlaps. Ids, timestamps, checkpoints
 *  and limit-warning flags are builder-local and excluded, so a book loaded
 *  from the host hashes the same as the copy that was saved to it. */
export function contentHash(lorebook) {
  const projection = {
    n: typeof lorebook?.name === 'string' ? lorebook.name : '',
    e: (lorebook?.entries ?? []).map((e) => [
      typeof e.name === 'string' ? e.name : '',
      TYPE_LABEL[e.type] ?? TYPE_LABEL[normalizeType(e.type)],
      Array.isArray(e.triggers) ? e.triggers.filter((t) => typeof t === 'string') : [],
      typeof e.description === 'string' ? e.description : '',
      e.isPublic === true,
      e.hiddenFromExport === true,
      e.folderId == null ? null : String(e.folderId),
    ]),
    f: (lorebook?.folders ?? []).map((f) => [
      String(f.id),
      typeof f.name === 'string' ? f.name : '',
      typeof f.color === 'string' ? f.color : '',
      f.parentId == null ? null : String(f.parentId),
      Number.isFinite(f.order) ? f.order : 0,
    ]),
    o: (lorebook?.allowedOverlaps ?? []).filter((s) => typeof s === 'string'),
  };
  return cyrb53(JSON.stringify(projection)).toString(16);
}

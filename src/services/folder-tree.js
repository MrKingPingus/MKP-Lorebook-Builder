// Pure folder helpers: folder creation, entry assignment (including the
// entries[] splice that keeps a folder's members contiguous), folder removal,
// and the render walk that turns a flat entry list + folder list into the
// ordered sequence of folder blocks and loose entries the list renders.
//
// No React, no stores — everything here takes arrays in and returns new
// arrays out.
import { uid } from './entry-factory.js';
import {
  DEFAULT_FOLDER,
  DEFAULT_LOREBOOK,
} from '../constants/defaults.js';
import {
  FOLDER_COLORS,
  DEFAULT_COLLAPSE_STATE,
  COLLAPSE_CYCLE,
  NEW_FOLDER_NAME,
} from '../constants/folders.js';

// Colour for the next folder: walk the swatch list in order so a user making
// several folders in a row gets visually distinct ones without picking.
function nextColor(folders) {
  const swatch = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
  return swatch.color;
}

export function createFolder(folders = [], overrides = {}) {
  const maxOrder = folders.reduce((m, f) => Math.max(m, f.order ?? 0), -1);
  return {
    ...DEFAULT_FOLDER,
    id:            uid(),
    name:          NEW_FOLDER_NAME,
    color:         nextColor(folders),
    collapseState: DEFAULT_COLLAPSE_STATE,
    order:         maxOrder + 1,
    ...overrides,
  };
}

// Next state in the collapse cycle. Falls back to the head of the cycle for a
// state that isn't currently cycled through (e.g. a `condensed` folder while
// the compact card variant doesn't exist yet).
export function nextCollapseState(current) {
  const i = COLLAPSE_CYCLE.indexOf(current);
  if (i === -1) return COLLAPSE_CYCLE[0];
  return COLLAPSE_CYCLE[(i + 1) % COLLAPSE_CYCLE.length];
}

export function getFolder(folders, folderId) {
  if (!folderId) return null;
  return (folders ?? []).find((f) => f.id === folderId) ?? null;
}

// An entry counts as filed only when its folderId matches a folder that still
// exists. Everything else — null, or a dangling id left behind by an undo —
// reads as top-level.
export function isFiledIn(entry, folders, folderId) {
  return entry.folderId === folderId && !!getFolder(folders, folderId);
}

export function countEntriesInFolder(entries, folderId) {
  return (entries ?? []).filter((e) => e.folderId === folderId).length;
}

// Move `ids` into `targetFolderId` (null unfiles them) AND reposition them in
// entries[] so a folder's members stay contiguous.
//
// The moved block lands directly after the last entry that still belongs to
// the anchor folder — the target folder when filing, or the first mover's
// former folder when unfiling. With no such entry (a brand-new or empty
// folder) the block stays where the first mover already was. Relative order
// among the moved entries is always preserved.
export function assignEntriesToFolder(entries, ids, targetFolderId) {
  const moving = new Set(ids);
  if (moving.size === 0) return entries;

  const firstMoverIdx = entries.findIndex((e) => moving.has(e.id));
  if (firstMoverIdx === -1) return entries;

  const nextFolderId = targetFolderId ?? null;
  const anchorFolderId = nextFolderId ?? entries[firstMoverIdx].folderId ?? null;

  const now = Date.now();
  const moved = [];
  const rest  = [];
  entries.forEach((e) => {
    if (moving.has(e.id)) {
      moved.push(e.folderId === nextFolderId ? e : { ...e, folderId: nextFolderId, lastModified: now });
    } else {
      rest.push(e);
    }
  });

  // Where the block goes: after the anchor folder's last surviving member,
  // else at the first mover's original slot (counted among the entries that
  // aren't moving).
  let insertAt = -1;
  if (anchorFolderId) {
    for (let i = rest.length - 1; i >= 0; i -= 1) {
      if (rest[i].folderId === anchorFolderId) { insertAt = i + 1; break; }
    }
  }
  if (insertAt === -1) {
    insertAt = entries.slice(0, firstMoverIdx).filter((e) => !moving.has(e.id)).length;
  }

  return [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
}

// Delete a folder and unfile everything inside it. Members keep their slot in
// entries[] — they're already contiguous, so they simply become a run of
// top-level entries where the folder used to be.
export function removeFolder(entries, folders, folderId) {
  return {
    entries: (entries ?? []).map((e) =>
      e.folderId === folderId ? { ...e, folderId: null } : e
    ),
    folders: (folders ?? []).filter((f) => f.id !== folderId),
  };
}

export function updateFolder(folders, folderId, patch) {
  return (folders ?? []).map((f) => (f.id === folderId ? { ...f, ...patch } : f));
}

// Turn a display-ordered entry list into the render sequence.
//
// A folder is emitted at the position of its FIRST member and swallows every
// one of its members at once, so entries stay grouped even when a sort has
// scattered them through the display list. Loose entries render inline
// wherever they fall, which keeps folders and unfiled entries interleaved
// rather than segregated into bands.
//
// Folders with no visible members can't anchor anywhere, so they trail the
// list ordered by `order` — that's what makes a freshly created empty folder
// show up at all. `hideEmptyFolders` drops them instead (used while a search
// is narrowing the list, where an empty folder is pure noise).
//
// Returns: [{ kind: 'folder', folder, entries }, { kind: 'entry', entry }, …]
export function buildRenderItems(displayEntries, folders, { hideEmptyFolders = false } = {}) {
  const list = displayEntries ?? [];
  const all  = folders ?? [];

  const byFolder = new Map();
  for (const entry of list) {
    const folder = getFolder(all, entry.folderId);
    if (!folder) continue;
    if (!byFolder.has(folder.id)) byFolder.set(folder.id, []);
    byFolder.get(folder.id).push(entry);
  }

  const items   = [];
  const emitted = new Set();

  for (const entry of list) {
    const folder = getFolder(all, entry.folderId);
    if (!folder) {
      items.push({ kind: 'entry', entry });
      continue;
    }
    if (emitted.has(folder.id)) continue;
    emitted.add(folder.id);
    items.push({ kind: 'folder', folder, entries: byFolder.get(folder.id) ?? [] });
  }

  if (!hideEmptyFolders) {
    all
      .filter((f) => !emitted.has(f.id))
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .forEach((folder) => items.push({ kind: 'folder', folder, entries: [] }));
  }

  return items;
}

// Read folders off a lorebook, tolerating books saved before folders existed.
export function foldersOf(lorebook) {
  return lorebook?.folders ?? DEFAULT_LOREBOOK.folders;
}

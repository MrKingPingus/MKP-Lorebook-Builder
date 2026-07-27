// Pure drop resolution: turn "these ids were dropped here" into the next
// entries[] (and folders[], for a folder drag). No React, no stores — the whole
// table of drop outcomes is testable in-process.
//
// The governing rule is that a drop *position* implies the parent. Dropping
// between two entries adopts their folder, dropping onto a folder header files
// into it, and dropping past the end of the list leaves every folder. That is
// what lets one gesture write both the array order and `folderId` in a single
// step, which in turn is what lets a whole drag be one undo.
import {
  getFolder,
  subtreeEntryIds,
  subtreeFolderIds,
  gatherSubtree,
  updateFolder,
  canNest,
  assignEntriesToFolder,
  setFolderParent,
} from './folder-tree.js';
import { DROP_EDGES } from '../constants/drag.js';

// Move a set of entries so they sit immediately before/after `targetId`, taking
// on that target's folder. Ids keep their existing relative order in entries[].
export function moveEntriesToPosition(entries, ids, targetId, edge = DROP_EDGES.BEFORE) {
  const list   = entries ?? [];
  const moving = new Set(ids ?? []);
  if (moving.size === 0) return list;
  // Dropping a selection onto one of its own members has no meaning.
  if (moving.has(targetId)) return list;

  const target = list.find((e) => e.id === targetId);
  if (!target) return list;

  const nextFolderId = target.folderId ?? null;
  const moved = list.filter((e) => moving.has(e.id))
    .map((e) => (e.folderId === nextFolderId ? e : { ...e, folderId: nextFolderId }));
  const rest  = list.filter((e) => !moving.has(e.id));

  const at = rest.findIndex((e) => e.id === targetId);
  if (at === -1) return list;
  const insertAt = edge === DROP_EDGES.AFTER ? at + 1 : at;

  return [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
}

// Drop onto a folder header: file into that folder. Reuses the assignment
// splice the Move-to-folder button already goes through, so a drag and a menu
// pick land the entries in exactly the same place.
export function dropEntriesInFolder(entries, ids, folderId) {
  return assignEntriesToFolder(entries, ids ?? [], folderId ?? null);
}

// Drop past the end of the list: top level, at the end of entries[].
export function moveEntriesToEnd(entries, ids) {
  const list   = entries ?? [];
  const moving = new Set(ids ?? []);
  if (moving.size === 0) return list;
  const moved = list.filter((e) => moving.has(e.id))
    .map((e) => (e.folderId == null ? e : { ...e, folderId: null }));
  const rest  = list.filter((e) => !moving.has(e.id));
  return [...rest, ...moved];
}

// Whether a folder may be dropped so that it becomes a child of `parentId`.
// Guards the two ways this goes wrong: dropping a folder inside its own
// subtree (which would orphan the tree from the root), and busting the depth
// cap. `canNest` already covers both; this wraps it for the null/top-level case
// so callers don't have to special-case it.
export function canDropFolder(folders, folderId, parentId) {
  if (!folderId) return false;
  if (folderId === parentId) return false;
  return canNest(folders, folderId, parentId ?? null);
}

// Drop a folder onto another folder header — nest it inside.
export function dropFolderInFolder(entries, folders, folderId, parentId) {
  if (!canDropFolder(folders, folderId, parentId)) return null;
  return setFolderParent(entries, folders, folderId, parentId ?? null);
}

// Drop a folder between two entries: it joins whatever level those entries sit
// at, and its whole subtree travels there as one block.
export function moveFolderToPosition(entries, folders, folderId, targetId, edge = DROP_EDGES.BEFORE) {
  const list = entries ?? [];
  const target = list.find((e) => e.id === targetId);
  if (!target) return null;

  // Dropping onto an entry that lives inside the folder being dragged would ask
  // the folder to become its own descendant.
  const ownIds = new Set(subtreeEntryIds(list, folders, folderId));
  if (ownIds.has(targetId)) return null;

  const nextParent = target.folderId ?? null;
  if (nextParent && subtreeFolderIds(folders, folderId).includes(nextParent)) return null;
  if (!canDropFolder(folders, folderId, nextParent)) return null;

  const nextFolders = updateFolder(folders, folderId, { parentId: nextParent });
  // Gather first so the subtree is one contiguous block, then lift that block
  // out and set it down at the drop point.
  const gathered = gatherSubtree(list, nextFolders, folderId);
  const moving   = new Set(subtreeEntryIds(gathered, nextFolders, folderId));
  const block    = gathered.filter((e) => moving.has(e.id));
  const rest     = gathered.filter((e) => !moving.has(e.id));

  const at = rest.findIndex((e) => e.id === targetId);
  if (at === -1) return null;
  const insertAt = edge === DROP_EDGES.AFTER ? at + 1 : at;

  return {
    folders: nextFolders,
    entries: [...rest.slice(0, insertAt), ...block, ...rest.slice(insertAt)],
  };
}

// Move a folder out to the top level, at the end of the list.
export function moveFolderToEnd(entries, folders, folderId) {
  if (!canDropFolder(folders, folderId, null)) return null;
  const nextFolders = updateFolder(folders, folderId, { parentId: null });
  const gathered = gatherSubtree(entries ?? [], nextFolders, folderId);
  const moving   = new Set(subtreeEntryIds(gathered, nextFolders, folderId));
  const block    = gathered.filter((e) => moving.has(e.id));
  const rest     = gathered.filter((e) => !moving.has(e.id));
  return { folders: nextFolders, entries: [...rest, ...block] };
}

// Which entries a drag actually carries. Grabbing a row that is part of the
// current selection drags the whole selection; grabbing anything else drags
// just that row and leaves the selection alone — losing a selection you spent
// real clicks building, because you mis-grabbed one row, is the expensive
// mistake here.
export function dragPayloadFor(entryId, selectedIds, orderedIds) {
  const selected = selectedIds ?? new Set();
  if (!selected.has(entryId)) return [entryId];
  const order = orderedIds ?? [];
  const inOrder = order.filter((id) => selected.has(id));
  return inOrder.length > 0 ? inOrder : [entryId];
}

// A drop is a no-op when every dragged entry is already exactly where the drop
// would put it. Checked before snapshotting so a stray click-drag can't push an
// empty history step the user then has to undo twice.
export function isNoopEntryDrop(entries, ids, targetId, edge) {
  const next = moveEntriesToPosition(entries, ids, targetId, edge);
  const list = entries ?? [];
  if (next.length !== list.length) return false;
  return next.every((e, i) => e === list[i]);
}

// Folder a drop target belongs to, for highlighting the receiving folder block
// while the pointer hovers a position inside it.
export function dropTargetFolderId(entries, folders, targetId) {
  const target = (entries ?? []).find((e) => e.id === targetId);
  const folder = getFolder(folders, target?.folderId);
  return folder?.id ?? null;
}

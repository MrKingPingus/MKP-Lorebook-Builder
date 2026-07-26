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
  COLLAPSE_SEVERITY,
  COLLAPSE_STATES,
  MAX_FOLDER_DEPTH,
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

// ── Tree shape ──────────────────────────────────────────────────────────────
// A folder's parentId is only meaningful when it points at a folder that still
// exists; anything else (null, or an id left dangling by an undo) reads as top
// level, mirroring how a dangling entry.folderId reads as unfiled.
export function parentIdOf(folders, folder) {
  const parentId = folder?.parentId ?? null;
  return getFolder(folders, parentId) ? parentId : null;
}

export function childFoldersOf(folders, parentId) {
  return (folders ?? []).filter((f) => parentIdOf(folders, f) === (parentId ?? null));
}

// 1 for a top-level folder. Walks up the parent chain, guarding against a cycle
// in corrupt data rather than hanging.
export function depthOf(folders, folderId) {
  let depth = 0;
  let current = getFolder(folders, folderId);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current = getFolder(folders, parentIdOf(folders, current));
  }
  return depth;
}

// Every folder at or below `folderId`, the root included.
export function subtreeFolderIds(folders, folderId) {
  const out = [];
  const walk = (id) => {
    if (out.includes(id)) return;
    out.push(id);
    for (const child of childFoldersOf(folders, id)) walk(child.id);
  };
  if (getFolder(folders, folderId)) walk(folderId);
  return out;
}

// How many levels the subtree rooted at `folderId` occupies (1 = no children).
export function subtreeHeight(folders, folderId) {
  const children = childFoldersOf(folders, folderId);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => subtreeHeight(folders, c.id)));
}

// Can `folderId` become a child of `parentId` (null = top level)?
// Rejects three things: dropping a folder into itself or its own descendant
// (which would orphan the subtree into a cycle), and any move that would push
// the deepest leaf past MAX_FOLDER_DEPTH.
export function canNest(folders, folderId, parentId) {
  const folder = getFolder(folders, folderId);
  if (!folder) return false;
  if (!parentId) return true;
  if (parentId === folderId) return false;
  const parent = getFolder(folders, parentId);
  if (!parent) return false;
  if (subtreeFolderIds(folders, folderId).includes(parentId)) return false;
  return depthOf(folders, parentId) + subtreeHeight(folders, folderId) <= MAX_FOLDER_DEPTH;
}

// Folders a given folder could legally be moved under, for a picker.
export function eligibleParents(folders, folderId) {
  return (folders ?? []).filter((f) => f.id !== folderId && canNest(folders, folderId, f.id));
}

// Every entry belonging to the subtree rooted at `folderId`.
export function subtreeEntryIds(entries, folders, folderId) {
  const ids = new Set(subtreeFolderIds(folders, folderId));
  return (entries ?? []).filter((e) => ids.has(e.folderId)).map((e) => e.id);
}

// The order a subtree's entries should occupy in entries[]: a folder's own
// members first, then each child subtree in turn. Laying the block out this way
// makes array order and render order agree inside the subtree.
function subtreeEntryOrder(entries, folders, folderId) {
  const own = (entries ?? []).filter((e) => e.folderId === folderId);
  const children = childFoldersOf(folders, folderId).slice().sort((a, b) => {
    // Keep the sequence the user already sees: earliest member first, then
    // childless folders by their creation order.
    const posOf = (f) => {
      const ids = new Set(subtreeFolderIds(folders, f.id));
      const idx = (entries ?? []).findIndex((e) => ids.has(e.folderId));
      return idx === -1 ? Infinity : idx;
    };
    const pa = posOf(a);
    const pb = posOf(b);
    if (pa !== pb) return pa - pb;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  return [...own, ...children.flatMap((c) => subtreeEntryOrder(entries, folders, c.id))];
}

// Pull a whole subtree's entries into one contiguous block, anchored at the
// earliest position any of them currently occupies. Without this, nesting a
// folder would leave its entries scattered through entries[] — the tree would
// still render grouped, but export order would stop matching what's on screen,
// which is the property filing was made to preserve in the first place.
//
// `anchorIgnoring` excludes a set of entry ids from choosing the anchor. It's
// what makes a folder move *to* its destination rather than dragging the
// destination up to itself: when C joins Q, Q's block should stay where Q
// already was, so C's own entries don't get a vote on the anchor. Mirrors how
// filing entries into a folder sends the entries to the folder's run rather
// than the other way round.
export function gatherSubtree(entries, folders, folderId, { anchorIgnoring } = {}) {
  const list = entries ?? [];
  const moving = new Set(subtreeEntryIds(list, folders, folderId));
  if (moving.size === 0) return list;

  const ignore = anchorIgnoring ?? new Set();
  const anchors = list.filter((e) => moving.has(e.id) && !ignore.has(e.id));
  // Everything in the subtree is excluded (the folder brought all the entries
  // with it), so fall back to where the block already sits.
  const anchorId = (anchors.length > 0 ? anchors[0] : list.find((e) => moving.has(e.id))).id;

  const ordered  = subtreeEntryOrder(list, folders, folderId);
  const rest     = list.filter((e) => !moving.has(e.id));
  const anchorIdx = list.findIndex((e) => e.id === anchorId);
  const insertAt = list.slice(0, anchorIdx).filter((e) => !moving.has(e.id)).length;

  return [...rest.slice(0, insertAt), ...ordered, ...rest.slice(insertAt)];
}

// The topmost folder above `folderId` — the root of the tree it belongs to.
export function rootAncestorOf(folders, folderId) {
  let current = getFolder(folders, folderId);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = getFolder(folders, parentIdOf(folders, current));
    if (!parent) return current.id;
    current = parent;
  }
  return folderId;
}

// Re-parent a folder and re-gather so the array keeps matching the screen.
// Returns null when the move isn't legal, so callers can no-op.
//
// Gathering the moved folder alone isn't enough: it may already be contiguous
// while the tree it just joined is not. So this gathers the whole root tree on
// each side of the move — the one it left and the one it joined.
export function setFolderParent(entries, folders, folderId, parentId) {
  if (!canNest(folders, folderId, parentId ?? null)) return null;
  const formerParentId = parentIdOf(folders, getFolder(folders, folderId));
  const nextFolders = updateFolder(folders, folderId, { parentId: parentId ?? null });

  const roots = [];
  const addRoot = (id) => {
    if (!id) return;
    const root = rootAncestorOf(nextFolders, id);
    if (root && !roots.includes(root)) roots.push(root);
  };
  addRoot(folderId);
  addRoot(parentId);
  addRoot(formerParentId);

  // The moved subtree's own entries don't get to pull a destination tree out of
  // position — see gatherSubtree's `anchorIgnoring`.
  const travelling = new Set(subtreeEntryIds(entries, nextFolders, folderId));
  let nextEntries = entries;
  for (const root of roots) {
    nextEntries = gatherSubtree(nextEntries, nextFolders, root, { anchorIgnoring: travelling });
  }

  return { folders: nextFolders, entries: nextEntries };
}

// The state a folder actually renders at: the more collapsed of what it
// inherits from an ancestor and what it has set for itself. Inheriting never
// writes to the child, so opening the parent restores the child's own choice.
export function effectiveCollapseState(inherited, own) {
  const a = COLLAPSE_SEVERITY[inherited] ?? 0;
  const b = COLLAPSE_SEVERITY[own] ?? 0;
  return a >= b ? (inherited ?? COLLAPSE_STATES.FULL) : own;
}

// Move `ids` into `targetFolderId` (null unfiles them) AND reposition them in
// entries[] so the folder's members end up contiguous.
//
// Filing REBUILDS the destination folder's whole run rather than appending to
// it: existing members in their current order, then the arrivals, placed at the
// folder's first existing member (or where the first mover was, for an empty
// folder). Rebuilding means the function *establishes* contiguity instead of
// merely preserving it, so it also repairs a run that something else scattered
// — a raw drag-reorder, or a history undo landing on an older arrangement.
//
// Unfiling parks the moved block directly after whatever remains of its former
// folder, so an entry leaving a folder surfaces right where that folder sits.
// Relative order among the moved entries is always preserved.
export function assignEntriesToFolder(entries, ids, targetFolderId) {
  const moving = new Set(ids);
  if (moving.size === 0) return entries;

  const firstMoverIdx = entries.findIndex((e) => moving.has(e.id));
  if (firstMoverIdx === -1) return entries;

  const nextFolderId = targetFolderId ?? null;
  const now = Date.now();

  const moved  = [];
  const others = [];
  entries.forEach((e) => {
    if (moving.has(e.id)) {
      moved.push(e.folderId === nextFolderId ? e : { ...e, folderId: nextFolderId, lastModified: now });
    } else {
      others.push(e);
    }
  });

  // How many non-moving, non-run entries precede a given index — i.e. where
  // that index lands once the run has been lifted out.
  const offsetOf = (idx, belongsToRun) =>
    entries.slice(0, idx).filter((e) => !moving.has(e.id) && !belongsToRun(e)).length;

  if (nextFolderId) {
    const inRun   = (e) => e.folderId === nextFolderId;
    const staying = others.filter(inRun);
    const outside = others.filter((e) => !inRun(e));
    const anchorIdx = staying.length > 0
      ? entries.findIndex((e) => !moving.has(e.id) && inRun(e))
      : firstMoverIdx;
    const insertAt = offsetOf(anchorIdx, inRun);
    return [...outside.slice(0, insertAt), ...staying, ...moved, ...outside.slice(insertAt)];
  }

  // Unfiling: sit just after the last surviving member of the former folder.
  const formerFolderId = entries[firstMoverIdx].folderId ?? null;
  let insertAt = -1;
  if (formerFolderId) {
    for (let i = others.length - 1; i >= 0; i -= 1) {
      if (others[i].folderId === formerFolderId) { insertAt = i + 1; break; }
    }
  }
  if (insertAt === -1) insertAt = offsetOf(firstMoverIdx, () => false);

  return [...others.slice(0, insertAt), ...moved, ...others.slice(insertAt)];
}

// Delete a folder. Nothing below it is destroyed: its own entries unfile, and
// its child folders are promoted to whatever the deleted folder's parent was —
// so removing a middle folder leaves its children inside the grandparent
// rather than yanking them out to the top level. Members keep their slot in
// entries[], already contiguous, so they become a run where the folder was.
export function removeFolder(entries, folders, folderId) {
  const all = folders ?? [];
  const promoteTo = parentIdOf(all, getFolder(all, folderId));
  return {
    entries: (entries ?? []).map((e) =>
      e.folderId === folderId ? { ...e, folderId: null } : e
    ),
    folders: all
      .filter((f) => f.id !== folderId)
      .map((f) => (f.parentId === folderId ? { ...f, parentId: promoteTo } : f)),
  };
}

export function updateFolder(folders, folderId, patch) {
  return (folders ?? []).map((f) => (f.id === folderId ? { ...f, ...patch } : f));
}

// Turn a display-ordered entry list into the render TREE.
//
// Each level interleaves that level's loose entries with its child folders, in
// display order. A folder's position is its ANCHOR: the earliest display
// position of any entry anywhere in its subtree. That extension matters once
// folders nest, because a parent may hold no entries of its own — only child
// folders — and so has no position in entries[] to sit at.
//
// A folder whose whole subtree is empty can't anchor anywhere, so it trails its
// level ordered by `order` — that's what makes a freshly created folder
// visible. `hideEmptyFolders` drops those instead, for an active search where
// they'd be pure noise.
//
// Returns a tree:
//   { kind: 'folder', folder, depth, count, totalCount, children: [...items] }
//   { kind: 'entry',  entry,  depth }
// where `count` is the folder's direct members and `totalCount` its whole
// subtree — the number the header shows, since tucking hides all of it.
export function buildRenderItems(displayEntries, folders, { hideEmptyFolders = false } = {}) {
  const list = displayEntries ?? [];
  const all  = folders ?? [];

  const posOf = new Map();
  list.forEach((entry, i) => posOf.set(entry.id, i));

  const byFolder = new Map();
  const loose    = [];
  for (const entry of list) {
    const folder = getFolder(all, entry.folderId);
    if (!folder) { loose.push(entry); continue; }
    if (!byFolder.has(folder.id)) byFolder.set(folder.id, []);
    byFolder.get(folder.id).push(entry);
  }

  const childrenByParent = new Map();
  for (const folder of all) {
    const key = parentIdOf(all, folder) ?? '';
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(folder);
  }

  const anchorCache = new Map();
  function anchorOf(folderId, seen) {
    if (anchorCache.has(folderId)) return anchorCache.get(folderId);
    if (seen.has(folderId)) return undefined;          // cycle guard
    const nextSeen = new Set(seen).add(folderId);
    let best;
    for (const entry of byFolder.get(folderId) ?? []) {
      const p = posOf.get(entry.id);
      if (best === undefined || p < best) best = p;
    }
    for (const child of childrenByParent.get(folderId) ?? []) {
      const a = anchorOf(child.id, nextSeen);
      if (a !== undefined && (best === undefined || a < best)) best = a;
    }
    anchorCache.set(folderId, best);
    return best;
  }

  function totalIn(folderId, seen) {
    if (seen.has(folderId)) return 0;
    const nextSeen = new Set(seen).add(folderId);
    return (byFolder.get(folderId)?.length ?? 0)
      + (childrenByParent.get(folderId) ?? []).reduce((n, c) => n + totalIn(c.id, nextSeen), 0);
  }

  function buildLevel(parentKey, depth, seen) {
    const rows = [];
    const here = parentKey === '' ? loose : (byFolder.get(parentKey) ?? []);
    for (const entry of here) rows.push({ kind: 'entry', entry, sort: posOf.get(entry.id) });
    for (const folder of childrenByParent.get(parentKey) ?? []) {
      if (seen.has(folder.id)) continue;
      const sort = anchorOf(folder.id, seen);
      if (sort === undefined && hideEmptyFolders) continue;
      rows.push({ kind: 'folder', folder, sort, order: folder.order ?? 0 });
    }

    rows.sort((a, b) => {
      const aEmpty = a.sort === undefined;
      const bEmpty = b.sort === undefined;
      if (aEmpty && bEmpty) return (a.order ?? 0) - (b.order ?? 0);
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      return a.sort - b.sort;
    });

    return rows.map((row) => {
      if (row.kind === 'entry') return { kind: 'entry', entry: row.entry, depth };
      const nextSeen = new Set(seen).add(row.folder.id);
      return {
        kind:       'folder',
        folder:     row.folder,
        depth,
        count:      byFolder.get(row.folder.id)?.length ?? 0,
        totalCount: totalIn(row.folder.id, seen),
        children:   buildLevel(row.folder.id, depth + 1, nextSeen),
      };
    });
  }

  return buildLevel('', 0, new Set());
}

// Every entry in a render tree, in the order it renders. Mostly for tests and
// for anything that needs a flat view of what's on screen.
export function flattenRenderItems(items) {
  return (items ?? []).flatMap((item) => (
    item.kind === 'entry' ? [item.entry] : flattenRenderItems(item.children)
  ));
}

// Read folders off a lorebook, tolerating books saved before folders existed.
export function foldersOf(lorebook) {
  return lorebook?.folders ?? DEFAULT_LOREBOOK.folders;
}

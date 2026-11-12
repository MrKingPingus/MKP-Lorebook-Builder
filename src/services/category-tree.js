// The pure tree over a flat array of `{ id, parentId }` nodes — parentage,
// depth, subtrees, and whether a given move is legal.
//
// Lifted out of `folder-tree.js` when Entry Templates arrived (Phase 12, locked
// decision 7). Template categories and entry folders are the same tree with
// different contents, and the alternative was a second implementation of
// cycle-detection and depth-clamping that would drift from this one the first
// time either was fixed.
//
// **What did NOT come along is the point of the split.** Everything in
// `folder-tree.js` that touches `entries[]` stayed there — assignment, the
// contiguity splice, the render walk, the filters. This file has never heard of
// an entry, which is exactly why templates can use it.
//
// `maxDepth` is a parameter rather than a constant here: folders cap at
// MAX_FOLDER_DEPTH for a layout reason (each level costs indent in a pane that
// can be 360px wide) that a dropdown drilling in one level at a time does not
// share. The caller owns its own ceiling.
import { uid } from './entry-factory.js';

export function getNode(nodes, id) {
  if (!id) return null;
  return (nodes ?? []).find((n) => n.id === id) ?? null;
}

// A parentId is only meaningful while it points at a node that still exists.
// Anything else — null, or an id left dangling by an undo or a delete — reads
// as top level. That is what stops a removed parent from orphaning its
// children into a subtree nothing can reach.
export function parentIdOf(nodes, node) {
  const parentId = node?.parentId ?? null;
  return getNode(nodes, parentId) ? parentId : null;
}

export function childrenOf(nodes, parentId) {
  return (nodes ?? []).filter((n) => parentIdOf(nodes, n) === (parentId ?? null));
}

/** 1 for a top-level node. Walks up the parent chain, guarding against a cycle
 *  in corrupt data rather than hanging. */
export function depthOf(nodes, id) {
  let depth = 0;
  let current = getNode(nodes, id);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current = getNode(nodes, parentIdOf(nodes, current));
  }
  return depth;
}

/** Every node at or below `id`, the root included. */
export function subtreeIds(nodes, id) {
  const out = [];
  const walk = (nodeId) => {
    if (out.includes(nodeId)) return;
    out.push(nodeId);
    for (const child of childrenOf(nodes, nodeId)) walk(child.id);
  };
  if (getNode(nodes, id)) walk(id);
  return out;
}

/** How many levels the subtree rooted at `id` occupies (1 = no children). */
export function subtreeHeight(nodes, id) {
  const children = childrenOf(nodes, id);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => subtreeHeight(nodes, c.id)));
}

/**
 * Can `id` become a child of `parentId` (null = top level)?
 *
 * Rejects three things: dropping a node into itself, dropping it into its own
 * descendant (which would cut the subtree loose into a cycle), and any move
 * that would push the deepest leaf past `maxDepth`. The last one is why the
 * check needs the moved node's HEIGHT and not just the parent's depth — moving
 * a three-level subtree under a two-level parent is illegal even though the
 * node itself would only sit at level three.
 */
export function canNest(nodes, id, parentId, maxDepth) {
  const node = getNode(nodes, id);
  if (!node) return false;
  if (!parentId) return true;
  if (parentId === id) return false;
  const parent = getNode(nodes, parentId);
  if (!parent) return false;
  if (subtreeIds(nodes, id).includes(parentId)) return false;
  return depthOf(nodes, parentId) + subtreeHeight(nodes, id) <= maxDepth;
}

/** Nodes a given node could legally be moved under, for a picker. */
export function eligibleParents(nodes, id, maxDepth) {
  return (nodes ?? []).filter((n) => n.id !== id && canNest(nodes, id, n.id, maxDepth));
}

export function updateNode(nodes, id, patch) {
  return (nodes ?? []).map((n) => (n.id === id ? { ...n, ...patch } : n));
}

/** Remove a node and re-home its children onto its own parent, so deleting a
 *  middle level collapses the tree rather than hiding everything under it. */
export function removeNode(nodes, id) {
  const node = getNode(nodes, id);
  if (!node) return nodes ?? [];
  const newParent = parentIdOf(nodes, node);
  return (nodes ?? [])
    .filter((n) => n.id !== id)
    .map((n) => (n.parentId === id ? { ...n, parentId: newParent } : n));
}

/** The root-to-node chain, for a breadcrumb. Empty for a null/unknown id. */
export function pathTo(nodes, id) {
  const path = [];
  let current = getNode(nodes, id);
  const seen = new Set();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = getNode(nodes, parentIdOf(nodes, current));
  }
  return path;
}

/**
 * A new node, colour-cycled through `colors` so a user making several in a row
 * gets visually distinct ones without having to pick.
 *
 * `defaults` carries whatever shape the caller's node type adds beyond
 * `{ id, name, color, parentId, order }` — the folder version passes a
 * collapse state, the template-category version passes nothing.
 */
export function createNode(nodes = [], { name, colors, defaults = {}, overrides = {} } = {}) {
  const maxOrder = nodes.reduce((m, n) => Math.max(m, n.order ?? 0), -1);
  return {
    ...defaults,
    id:       uid(),
    name,
    color:    colors?.length ? colors[nodes.length % colors.length].color : '',
    parentId: null,
    order:    maxOrder + 1,
    ...overrides,
  };
}

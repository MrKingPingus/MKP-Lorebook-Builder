// Pure range maths for modifier+click selection. Takes an ordered list of entry
// ids and reports which ids a given click should add or remove — it never
// touches a store, so the whole gesture table is testable without a browser.
//
// `orderedIds` is display order, taken from the render tree. A tucked folder's
// entries are present in that list even though they aren't on screen: they
// genuinely sit between the two endpoints of a range, and skipping them would
// make a range mean something different depending on what happened to be
// collapsed. The folder header surfaces how many of its hidden entries are
// selected so the count is never a surprise.
import { SELECTION_ACTIONS } from '../constants/selection.js';

// Inclusive slice between two ids. An anchor that is no longer in the list —
// filtered away, deleted, or from the other crosstalk pane — degrades to a
// single-entry range rather than throwing the selection somewhere arbitrary.
export function rangeBetween(orderedIds, anchorId, targetId) {
  const list = orderedIds ?? [];
  const to   = list.indexOf(targetId);
  if (to === -1) return [];
  const from = anchorId == null ? -1 : list.indexOf(anchorId);
  if (from === -1) return [targetId];
  return from <= to ? list.slice(from, to + 1) : list.slice(to, from + 1);
}

// Resolve a click into an action plus the ids it applies to.
//
// `metaKey` counts as `ctrlKey`: on macOS Cmd is the natural modifier and a
// real ctrl+click there opens the context menu instead.
export function resolveSelectionClick({
  shiftKey = false,
  ctrlKey  = false,
  metaKey  = false,
  orderedIds = [],
  anchorId = null,
  targetId,
  isSelectMode = false,
} = {}) {
  const remove = ctrlKey || metaKey;
  const none   = { action: SELECTION_ACTIONS.NONE, ids: [], anchorId };

  if (targetId == null) return none;
  if (!shiftKey && !remove) return none;   // plain click — existing handling

  // Removing needs an existing selection, so a ctrl+click outside select mode
  // has nothing to act on. Only shift+click opens select mode.
  if (remove && !isSelectMode) return none;

  const ids = shiftKey ? rangeBetween(orderedIds, anchorId, targetId) : [targetId];
  if (ids.length === 0) return none;

  return {
    action:   remove ? SELECTION_ACTIONS.REMOVE : SELECTION_ACTIONS.ADD,
    ids,
    // Every macro click re-anchors, so a run of shift+clicks walks the range
    // outward from wherever you last acted.
    anchorId: targetId,
  };
}

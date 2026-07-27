// Drag state machine for the entry list: what is being dragged, where it would
// land, and the single commit that applies it.
//
// The old model reordered entries[] on every hover-swap. That could never
// express "into folder F" — no array swap means "change this row's parent" —
// and it pushed one history snapshot per row you dragged past, so undoing one
// gesture took a dozen Ctrl+Z presses and evicted a dozen slots from a 50-deep
// stack. This model tracks a *drop target* while you drag and writes once on
// release, which fixes both at the same time.
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import {
  moveEntriesToPosition,
  moveEntriesToEnd,
  dropEntriesInFolder,
  moveFolderToPosition,
  moveFolderToEnd,
  dropFolderInFolder,
  canDropFolder,
  dragPayloadFor,
  isNoopEntryDrop,
} from '../services/drag-drop.js';
import { foldersOf, getFolder, subtreeEntryIds } from '../services/folder-tree.js';
import {
  DROP_KINDS,
  DROP_EDGES,
  DRAG_KINDS,
  SPRING_OPEN_MS,
  AUTOSCROLL_ZONE_PX,
  AUTOSCROLL_MAX_PX,
} from '../constants/drag.js';
import { COLLAPSE_STATES } from '../constants/folders.js';

export function useEntryDrag(scrollRef) {
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const updateActiveEntriesAndFolders = useLorebookStore((s) => s.updateActiveEntriesAndFolders);
  const updateActiveFolders           = useLorebookStore((s) => s.updateActiveFolders);
  const pushSnapshot     = useHistoryStore((s) => s.pushSnapshot);
  const selectedIds      = useUiStore((s) => s.selectedIds);

  const activeLorebook = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  const entries = activeLorebook?.entries ?? [];
  const folders = foldersOf(activeLorebook);

  // `drag` is what's in hand; `target` is where it would land. Both are state
  // rather than refs because the list has to re-render to show the indicator.
  const [drag, setDrag]     = useState(null);   // { kind, ids, folderId }
  const [target, setTarget] = useState(null);   // { kind, id, edge }

  const springTimer = useRef(null);
  const springFor   = useRef(null);
  // Folders this drag sprang open, and what they were before. Anything the drop
  // didn't actually use gets put back — a folder you merely passed over on the
  // way somewhere else shouldn't be left hanging open behind you.
  const sprungOpen  = useRef(new Map());
  const scrollRaf   = useRef(null);
  const scrollVel   = useRef(0);

  const clearSpring = useCallback(() => {
    if (springTimer.current) clearTimeout(springTimer.current);
    springTimer.current = null;
    springFor.current   = null;
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = null;
    scrollVel.current = 0;
  }, []);

  // Auto-scroll runs off a single rAF loop whose velocity is updated by
  // dragover. Without it you cannot drag to a row that is off screen, which a
  // book of any size always has.
  const tickScroll = useCallback(() => {
    const el = scrollRef?.current;
    if (!el || scrollVel.current === 0) { scrollRaf.current = null; return; }
    const before = el.scrollTop;
    el.scrollTop += scrollVel.current;
    // Already hard against the top or bottom: stop rather than respin every
    // frame forever. Without this the loop keeps running for the whole drag —
    // and for good, if a drag is abandoned somewhere `dragend` never fires —
    // saturating the main thread while achieving nothing.
    if (el.scrollTop === before) { scrollVel.current = 0; scrollRaf.current = null; return; }
    scrollRaf.current = requestAnimationFrame(tickScroll);
  }, [scrollRef]);

  const updateAutoScroll = useCallback((clientY) => {
    const el = scrollRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top    = clientY - rect.top;
    const bottom = rect.bottom - clientY;
    let v = 0;
    if (top < AUTOSCROLL_ZONE_PX)         v = -AUTOSCROLL_MAX_PX * (1 - top / AUTOSCROLL_ZONE_PX);
    else if (bottom < AUTOSCROLL_ZONE_PX) v =  AUTOSCROLL_MAX_PX * (1 - bottom / AUTOSCROLL_ZONE_PX);
    scrollVel.current = Math.round(v);
    if (scrollVel.current !== 0 && scrollRaf.current === null) {
      scrollRaf.current = requestAnimationFrame(tickScroll);
    }
  }, [scrollRef, tickScroll]);

  useEffect(() => () => { clearSpring(); stopAutoScroll(); }, [clearSpring, stopAutoScroll]);

  // A drag released outside the list — or cancelled with Escape — fires dragend
  // somewhere we aren't listening. Without this backstop the list would stay
  // stuck in its dragging state, indicator and all.
  useEffect(() => {
    if (!drag) return undefined;
    // Runs after our own drop handler (window is the last stop on the bubble),
    // so a real drop has already decided which folder to leave open.
    function onEnd() { endDrag(); }
    window.addEventListener('dragend', onEnd);
    window.addEventListener('drop', onEnd);
    return () => {
      window.removeEventListener('dragend', onEnd);
      window.removeEventListener('drop', onEnd);
    };
  }, [drag, clearSpring, stopAutoScroll]);

  function startEntryDrag(entryId, orderedIds) {
    const ids = dragPayloadFor(entryId, selectedIds, orderedIds);
    setDrag({ kind: DRAG_KINDS.ENTRIES, ids });
    setTarget(null);
  }

  function startFolderDrag(folderId) {
    setDrag({ kind: DRAG_KINDS.FOLDER, folderId, ids: subtreeEntryIds(entries, folders, folderId) });
    setTarget(null);
  }

  // Is this a legal place to put what's in hand? Checked while hovering so the
  // indicator simply doesn't appear where a drop would be refused, rather than
  // appearing and then silently doing nothing on release.
  function targetAllowed(next) {
    if (!drag || !next) return false;

    if (drag.kind === DRAG_KINDS.FOLDER) {
      if (next.kind === DROP_KINDS.ROOT_END) return canDropFolder(folders, drag.folderId, null);
      if (next.kind === DROP_KINDS.FOLDER)   return canDropFolder(folders, drag.folderId, next.id);
      const entry = entries.find((e) => e.id === next.id);
      if (!entry) return false;
      // Its own entries move with it, so they can't also be the destination.
      if (drag.ids.includes(next.id)) return false;
      return canDropFolder(folders, drag.folderId, entry.folderId ?? null);
    }

    if (next.kind === DROP_KINDS.ENTRY && drag.ids.includes(next.id)) return false;
    return true;
  }

  function hoverTarget(next, clientY) {
    if (!drag) return;
    if (typeof clientY === 'number') updateAutoScroll(clientY);
    if (!targetAllowed(next)) { setTarget(null); clearSpring(); return; }

    setTarget((prev) => (
      prev && prev.kind === next.kind && prev.id === next.id && prev.edge === next.edge ? prev : next
    ));

    // Spring-loaded folders: rest on a tucked folder and it opens so you can
    // aim at a row inside it. It stays open afterwards — you almost certainly
    // want to see what you just dropped in there.
    if (next.kind === DROP_KINDS.FOLDER) {
      const folder = getFolder(folders, next.id);
      const shut   = folder && folder.collapseState === COLLAPSE_STATES.TUCKED;
      if (shut && springFor.current !== next.id) {
        clearSpring();
        springFor.current = next.id;
        springTimer.current = setTimeout(() => {
          if (!sprungOpen.current.has(next.id)) {
            sprungOpen.current.set(next.id, folder.collapseState);
          }
          updateActiveFolders(
            folders.map((f) => (f.id === next.id ? { ...f, collapseState: COLLAPSE_STATES.FULL } : f)),
          );
        }, SPRING_OPEN_MS);
      }
    } else {
      clearSpring();
    }
  }

  // Put back any folder this drag sprang open that the drop didn't end up
  // using. `keepOpenId` is the folder the entries actually landed in — that one
  // stays open, because you want to see what you just put there.
  function restoreSprungFolders(keepOpenId = null) {
    const sprung = sprungOpen.current;
    sprungOpen.current = new Map();
    if (sprung.size === 0) return;

    const current = foldersOf(
      useLorebookStore.getState().lorebooks[useLorebookStore.getState().activeLorebookId],
    );
    let changed = false;
    const next = current.map((f) => {
      if (!sprung.has(f.id) || f.id === keepOpenId) return f;
      // Only put it back if it is still sitting at the state we opened it to —
      // if the user clicked the header themselves mid-drag, that wins.
      if (f.collapseState !== COLLAPSE_STATES.FULL) return f;
      changed = true;
      return { ...f, collapseState: sprung.get(f.id) };
    });
    if (changed) updateActiveFolders(next);
  }

  function endDrag(keepOpenId = null) {
    restoreSprungFolders(keepOpenId);
    setDrag(null);
    setTarget(null);
    clearSpring();
    stopAutoScroll();
  }

  // One snapshot, one write, for the whole gesture.
  function commitDrop() {
    if (!drag || !target || !targetAllowed(target)) { endDrag(); return; }

    const snapshot = () => pushSnapshot({ entries: [...entries], folders: [...folders] });

    // The folder the drop lands in stays open; anything else this drag sprang
    // open on the way gets put back.
    const landedIn = target.kind === DROP_KINDS.FOLDER
      ? target.id
      : (target.kind === DROP_KINDS.ENTRY
          ? (entries.find((e) => e.id === target.id)?.folderId ?? null)
          : null);

    if (drag.kind === DRAG_KINDS.FOLDER) {
      let next = null;
      if (target.kind === DROP_KINDS.FOLDER)        next = dropFolderInFolder(entries, folders, drag.folderId, target.id);
      else if (target.kind === DROP_KINDS.ROOT_END) next = moveFolderToEnd(entries, folders, drag.folderId);
      else                                         next = moveFolderToPosition(entries, folders, drag.folderId, target.id, target.edge);
      if (next) {
        snapshot();
        updateActiveEntriesAndFolders(next.entries, next.folders);
      }
      endDrag(next ? landedIn : null);
      return;
    }

    let nextEntries = entries;
    if (target.kind === DROP_KINDS.FOLDER) {
      nextEntries = dropEntriesInFolder(entries, drag.ids, target.id);
    } else if (target.kind === DROP_KINDS.ROOT_END) {
      nextEntries = moveEntriesToEnd(entries, drag.ids);
    } else {
      // A drag that ends exactly where it started shouldn't cost a history step.
      if (isNoopEntryDrop(entries, drag.ids, target.id, target.edge)) { endDrag(landedIn); return; }
      nextEntries = moveEntriesToPosition(entries, drag.ids, target.id, target.edge);
    }

    if (nextEntries !== entries) {
      snapshot();
      updateActiveEntriesAndFolders(nextEntries, folders);
    }
    endDrag(landedIn);
  }

  const draggingIds = drag ? new Set(drag.ids) : null;

  return {
    isDragging:      drag !== null,
    dragKind:        drag?.kind ?? null,
    draggingFolderId: drag?.folderId ?? null,
    dragCount:       drag?.ids?.length ?? 0,
    isDragged:       (id) => (draggingIds ? draggingIds.has(id) : false),
    dropTarget:      target,
    startEntryDrag,
    startFolderDrag,
    hoverTarget,
    commitDrop,
    endDrag,
    DROP_KINDS,
    DROP_EDGES,
  };
}

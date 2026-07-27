// Pure-logic checks for services/drag-drop.js — the drop resolution table.
//
// This is the highest-risk code in phase 11: a drop writes both entries[] order
// and folderId in one step, and getting it wrong silently reorders or re-files
// a book. Exercising it here costs milliseconds; through the browser it would
// cost a scenario per case.
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
} from '../src/services/drag-drop.js';
import { buildRenderItems, flattenRenderItems } from '../src/services/folder-tree.js';
import { COLLAPSE_STATES, MAX_FOLDER_DEPTH } from '../src/constants/folders.js';
import { DROP_EDGES } from '../src/constants/drag.js';

// 'a:F1' = entry a filed in F1; 'b' = loose entry b.
function book(spec) {
  return spec.split(' ').map((token) => {
    const [id, folderId] = token.split(':');
    return { id, name: id.toUpperCase(), type: 'character', folderId: folderId ?? null };
  });
}
function show(entries) {
  return entries.map((e) => (e.folderId ? `${e.id}:${e.folderId}` : e.id)).join(' ');
}
function folder(id, overrides = {}) {
  return { id, name: id, color: '#fff', parentId: null, collapseState: COLLAPSE_STATES.FULL, order: 0, ...overrides };
}
function showItems(items) {
  return (items ?? []).map((item) => (
    item.kind === 'folder'
      ? `[${item.folder.id}${item.children.length ? ' ' + showItems(item.children) : ''}]`
      : item.entry.id
  )).join(' ');
}

export function runDragDropChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ drag-drop (pure logic)');

  const { BEFORE, AFTER } = DROP_EDGES;

  // ── entries: plain reorder at one level ────────────────────────────────────
  {
    const b = book('a b c d');
    check('drop before an earlier row moves it up',
      show(moveEntriesToPosition(b, ['d'], 'b', BEFORE)), 'a d b c');
    check('drop after a later row moves it down',
      show(moveEntriesToPosition(b, ['a'], 'c', AFTER)), 'b c a d');
    check('dropping onto itself changes nothing',
      show(moveEntriesToPosition(b, ['a'], 'a', BEFORE)), 'a b c d');
    check('an unknown target changes nothing',
      show(moveEntriesToPosition(b, ['a'], 'nope', BEFORE)), 'a b c d');
    check('an empty payload changes nothing',
      show(moveEntriesToPosition(b, [], 'a', BEFORE)), 'a b c d');
  }

  // ── entries: the position decides the folder ──────────────────────────────
  // This is the whole rule. Dropping next to a filed row joins its folder;
  // dropping next to a loose row leaves every folder.
  {
    const F = [folder('F1')];
    const b = book('a b:F1 c:F1 d');

    // "before c" means immediately before c — which is *after* b, since b was
    // already there. The row lands where the indicator was, not at the front of
    // the folder.
    check('dropping beside a filed row joins that folder',
      show(moveEntriesToPosition(b, ['a'], 'c', BEFORE)), 'b:F1 a:F1 c:F1 d');
    check('dropping beside a loose row leaves the folder',
      show(moveEntriesToPosition(b, ['b'], 'd', BEFORE)), 'a c:F1 b d');
    check('dropping at the end unfiles',
      show(moveEntriesToEnd(b, ['b'])), 'a c:F1 d b');
    check('a row already in the target folder keeps its object identity',
      moveEntriesToPosition(b, ['c'], 'b', BEFORE).find((e) => e.id === 'c') === b.find((e) => e.id === 'c'),
      true);

    // Contiguity is the invariant everything else depends on: a folder's
    // members must stay in one run in entries[] or the render walk mis-anchors.
    const joined = moveEntriesToPosition(b, ['a'], 'c', BEFORE);
    const idx = joined.map((e, i) => (e.folderId === 'F1' ? i : -1)).filter((i) => i >= 0);
    check('the folder run stays contiguous after a join',
      idx.every((v, i) => i === 0 || v === idx[i - 1] + 1), true);
  }

  // ── entries: multi-drag ────────────────────────────────────────────────────
  {
    const b = book('a b c d e');
    check('a multi-drag lands as one contiguous block',
      show(moveEntriesToPosition(b, ['a', 'c'], 'e', BEFORE)), 'b d a c e');
    check('a multi-drag keeps the payload in list order',
      show(moveEntriesToPosition(b, ['c', 'a'], 'e', BEFORE)), 'b d a c e');
    check('dropping a selection onto one of its own members is refused',
      show(moveEntriesToPosition(b, ['a', 'c'], 'c', BEFORE)), 'a b c d e');
    check('no entry is lost to a multi-drag',
      moveEntriesToPosition(b, ['a', 'c'], 'e', BEFORE).length, b.length);
  }

  // ── entries: onto a folder header ─────────────────────────────────────────
  {
    const F = [folder('F1')];
    // A header drop appends to the folder's existing members, exactly as the
    // Move-to-folder menu does — a drag and a menu pick must agree.
    check('dropping on a header appends to the folder',
      show(dropEntriesInFolder(book('a b:F1 c'), ['a'], 'F1')), 'b:F1 a:F1 c');
    check('dropping on an empty folder header still files',
      show(dropEntriesInFolder(book('a b'), ['a'], 'F1')).includes('a:F1'), true);
    check('dropping on a header with null unfiles',
      show(dropEntriesInFolder(book('a:F1 b'), ['a'], null)), 'a b');
  }

  // ── the drag payload ───────────────────────────────────────────────────────
  // Grabbing a selected row takes the selection; grabbing anything else takes
  // just that row and leaves the selection intact.
  {
    const order = ['a', 'b', 'c', 'd'];
    const sel   = new Set(['b', 'd']);
    check('grabbing a selected row drags the whole selection',
      dragPayloadFor('b', sel, order).join(''), 'bd');
    check('the payload comes out in display order',
      dragPayloadFor('d', sel, order).join(''), 'bd');
    check('grabbing an unselected row drags only it',
      dragPayloadFor('a', sel, order).join(''), 'a');
    check('with no selection at all it drags only it',
      dragPayloadFor('a', new Set(), order).join(''), 'a');
  }

  // ── no-op detection ────────────────────────────────────────────────────────
  // A drag that ends where it started must not cost a history step, or undo
  // silently needs two presses.
  {
    const b = book('a b c');
    check('dropping after the row above is a no-op', isNoopEntryDrop(b, ['b'], 'a', AFTER), true);
    check('dropping before the row below is a no-op', isNoopEntryDrop(b, ['b'], 'c', BEFORE), true);
    check('a real move is not a no-op', isNoopEntryDrop(b, ['a'], 'c', AFTER), false);
    // Same position, but the folder changes — that is a real edit.
    const f = book('a b:F1');
    check('a refile in place is not a no-op', isNoopEntryDrop(f, ['a'], 'b', BEFORE), false);
  }

  // ── folders: legality ──────────────────────────────────────────────────────
  {
    const nest = [folder('P'), folder('C', { parentId: 'P' })];
    check('a folder cannot be dropped into itself', canDropFolder(nest, 'P', 'P'), false);
    check('a folder cannot be dropped into its own child', canDropFolder(nest, 'P', 'C'), false);
    check('a child can be dropped to the top level', canDropFolder(nest, 'C', null), true);
    check('a folder can be dropped into an unrelated folder',
      canDropFolder([...nest, folder('X')], 'X', 'P'), true);
    check('no folder id is never droppable', canDropFolder(nest, null, 'P'), false);

    // The depth cap still binds through a drag, not just through the ⇥ menu.
    const deep = [folder('L1'), folder('L2', { parentId: 'L1' }), folder('L3', { parentId: 'L2' }), folder('X')];
    check(`a drop that would exceed depth ${MAX_FOLDER_DEPTH} is refused`,
      canDropFolder(deep, 'L1', 'X'), false);
  }

  // ── folders: dropping into another folder ─────────────────────────────────
  {
    const fs = [folder('A'), folder('B')];
    const b  = book('a:A b:B');
    const next = dropFolderInFolder(b, fs, 'B', 'A');
    check('nesting a folder sets its parent',
      next.folders.find((f) => f.id === 'B').parentId, 'A');
    check('and its entries travel into the parent block',
      showItems(buildRenderItems(next.entries, next.folders)), '[A a [B b]]');
    check('an illegal nest returns null', dropFolderInFolder(b, fs, 'A', 'A'), null);
  }

  // ── folders: dropping between entries ─────────────────────────────────────
  {
    const fs = [folder('F')];
    const b  = book('a b c:F d');

    // Dropping the folder beside a top-level row keeps it top level and moves
    // the whole block there.
    const up = moveFolderToPosition(b, fs, 'F', 'a', BEFORE);
    check('a folder dropped above the first row moves its block there',
      show(up.entries), 'c:F a b d');
    check('and it stays at the top level', up.folders.find((f) => f.id === 'F').parentId, null);

    // Dropping it beside a row that lives inside another folder nests it there.
    const fs2 = [folder('F'), folder('G')];
    const b2  = book('a:G b c:F');
    const into = moveFolderToPosition(b2, fs2, 'F', 'a', AFTER);
    check('a folder dropped beside a filed row joins that folder',
      into.folders.find((f) => f.id === 'F').parentId, 'G');
    check('and renders nested', showItems(buildRenderItems(into.entries, into.folders)), '[G a [F c]] b');

    check('dropping a folder onto its own entry is refused',
      moveFolderToPosition(b, fs, 'F', 'c', BEFORE), null);

    const end = moveFolderToEnd(b, fs, 'F');
    check('a folder dropped past the end goes top level, last',
      show(end.entries), 'a b d c:F');
  }

  // ── nothing is ever lost ───────────────────────────────────────────────────
  // The single invariant worth checking on every path: a drop rearranges, it
  // never adds or drops an entry.
  {
    const fs = [folder('P'), folder('C', { parentId: 'P' })];
    const b  = book('a:P b c:C d');
    const ids = (list) => list.map((e) => e.id).sort().join('');

    check('reorder preserves the set', ids(moveEntriesToPosition(b, ['d'], 'a', BEFORE)), 'abcd');
    check('file-into preserves the set', ids(dropEntriesInFolder(b, ['b', 'd'], 'C')), 'abcd');
    check('move-to-end preserves the set', ids(moveEntriesToEnd(b, ['a'])), 'abcd');
    check('folder move preserves the set', ids(moveFolderToPosition(b, fs, 'C', 'b', BEFORE).entries), 'abcd');
    check('folder-to-end preserves the set', ids(moveFolderToEnd(b, fs, 'C').entries), 'abcd');

    // And the render walk still shows every entry exactly once afterwards.
    const moved = moveFolderToPosition(b, fs, 'C', 'b', BEFORE);
    const shown = flattenRenderItems(buildRenderItems(moved.entries, moved.folders));
    check('every entry renders exactly once after a folder move',
      shown.map((e) => e.id).sort().join(''), 'abcd');
  }

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} drag-drop checks passed`);
  return results.every(Boolean);
}

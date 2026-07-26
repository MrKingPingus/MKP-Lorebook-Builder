// Pure-logic checks for services/folder-tree.js. No browser, no dev server —
// these run in-process in milliseconds, so the folder maths can be exercised
// far more thoroughly than it's worth doing through the UI.
//
// Two functions carry almost all the risk and get most of the attention:
//   assignEntriesToFolder — the entries[] splice that keeps a folder's members
//     contiguous. Wrong here and filing an entry silently reorders the book.
//   buildRenderItems — anchors each folder at its first member and swallows all
//     of them. Wrong here and entries duplicate or vanish from the list.
import {
  createFolder,
  assignEntriesToFolder,
  removeFolder,
  updateFolder,
  nextCollapseState,
  countEntriesInFolder,
  getFolder,
  isFiledIn,
  buildRenderItems,
  foldersOf,
} from '../src/services/folder-tree.js';
import { COLLAPSE_STATES } from '../src/constants/folders.js';

// Compact readable shorthand: 'a:F1' = entry id 'a' filed in folder 'F1',
// 'b' = entry id 'b', unfiled. Lets a whole book be written on one line.
function book(spec) {
  return spec.split(' ').map((token) => {
    const [id, folderId] = token.split(':');
    return { id, name: id.toUpperCase(), type: 'character', folderId: folderId ?? null };
  });
}

// Inverse of book() — render an entries array back to the same shorthand so a
// failure prints the whole arrangement rather than "expected true, got false".
function show(entries) {
  return entries.map((e) => (e.folderId ? `${e.id}:${e.folderId}` : e.id)).join(' ');
}

function folder(id, overrides = {}) {
  return { id, name: id, color: '#fff', parentId: null, collapseState: COLLAPSE_STATES.FULL, order: 0, ...overrides };
}

// Render the walk output as shorthand: '[F1 a c] b' = folder F1 holding a and c,
// then loose entry b.
function showItems(items) {
  return items.map((item) => (
    item.kind === 'folder'
      ? `[${item.folder.id}${item.entries.length ? ' ' + item.entries.map((e) => e.id).join(' ') : ''}]`
      : item.entry.id
  )).join(' ');
}

export function runFolderTreeChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ folder-tree (pure logic)');

  // ── assignEntriesToFolder: the contiguity splice ───────────────────────────
  const F1 = [folder('F1')];

  check('file one entry into an empty folder — stays put',
    show(assignEntriesToFolder(book('a b c'), ['b'], 'F1')), 'a b:F1 c');

  check('file two non-adjacent entries — they gather at the first one',
    show(assignEntriesToFolder(book('a b c d'), ['a', 'c'], 'F1')), 'a:F1 c:F1 b d');

  check('file into a folder that already has members — appends to its run',
    show(assignEntriesToFolder(book('a:F1 b c'), ['c'], 'F1')), 'a:F1 c:F1 b');

  check('members stay contiguous when filing from both sides',
    show(assignEntriesToFolder(book('x a:F1 y b:F1 z'), ['x', 'z'], 'F1')),
    'a:F1 b:F1 x:F1 z:F1 y');

  check('filing repairs a run that something else had scattered',
    show(assignEntriesToFolder(book('a:F1 y b:F1 z'), ['z'], 'F1')), 'a:F1 b:F1 z:F1 y');

  check('moving between folders lands in the destination run',
    show(assignEntriesToFolder(book('a:F1 b:F1 c:F2 d'), ['b'], 'F2')), 'a:F1 c:F2 b:F2 d');

  check('unfiling parks the entry just after its old folder-mates',
    show(assignEntriesToFolder(book('a:F1 b:F1 c:F1 d'), ['b'], null)), 'a:F1 c:F1 b d');

  check('unfiling every member leaves the run where it was',
    show(assignEntriesToFolder(book('x a:F1 b:F1 y'), ['a', 'b'], null)), 'x a b y');

  check('relative order among moved entries is preserved',
    show(assignEntriesToFolder(book('a b c d e'), ['e', 'a', 'c'], 'F1')), 'a:F1 c:F1 e:F1 b d');

  check('no entries are ever lost',
    assignEntriesToFolder(book('a b c d e'), ['b', 'd'], 'F1').length, 5);

  // No-ops and bad input must return something sane rather than reordering.
  check('empty id list is a no-op',
    show(assignEntriesToFolder(book('a b c'), [], 'F1')), 'a b c');
  check('unknown ids are a no-op',
    show(assignEntriesToFolder(book('a b c'), ['zzz'], 'F1')), 'a b c');
  check('accepts a Set as well as an array',
    show(assignEntriesToFolder(book('a b c'), new Set(['b']), 'F1')), 'a b:F1 c');
  check('re-filing into the same folder does not duplicate',
    show(assignEntriesToFolder(book('a:F1 b'), ['a'], 'F1')), 'a:F1 b');

  // ── buildRenderItems: anchoring and swallowing ─────────────────────────────
  check('folder anchors at its first member and swallows the rest',
    showItems(buildRenderItems(book('a:F1 b c:F1'), F1)), '[F1 a c] b');

  check('loose entries stay interleaved around folders',
    showItems(buildRenderItems(book('x a:F1 y'), F1)), 'x [F1 a] y');

  check('two folders each anchor independently',
    showItems(buildRenderItems(book('a:F1 b:F2 c:F1 d:F2'), [folder('F1'), folder('F2')])),
    '[F1 a c] [F2 b d]');

  check('every entry appears exactly once',
    buildRenderItems(book('a:F1 b c:F1 d'), F1)
      .flatMap((i) => (i.kind === 'folder' ? i.entries : [i.entry])).length, 4);

  // An id with no matching folder must read as top-level — that's what stops a
  // history undo that removed a folder from orphaning its entries.
  // `a` points at a folder that no longer exists, so it renders as a loose
  // entry. F1 still trails as an empty folder — that part is correct.
  check('dangling folderId renders top-level',
    showItems(buildRenderItems(book('a:GONE b'), F1)), 'a b [F1]');
  check('dangling folderId is not swallowed by a real folder',
    showItems(buildRenderItems(book('a:GONE b:F1'), F1)), 'a [F1 b]');

  // An empty folder has no member to anchor to, so it trails the list — that's
  // what makes a freshly created folder visible at all.
  check('empty folder trails the list',
    showItems(buildRenderItems(book('a b'), F1)), 'a b [F1]');
  check('empty folders trail in `order`',
    showItems(buildRenderItems(book('a'), [folder('F2', { order: 2 }), folder('F1', { order: 1 })])),
    'a [F1] [F2]');
  check('hideEmptyFolders drops them (search behaviour)',
    showItems(buildRenderItems(book('a b'), F1, { hideEmptyFolders: true })), 'a b');
  check('hideEmptyFolders keeps folders that do have matches',
    showItems(buildRenderItems(book('a:F1'), F1, { hideEmptyFolders: true })), '[F1 a]');

  // Sorting scatters members through the display list; the walk must still
  // group them, which is the whole reason it collects by folder up front.
  check('scattered members still group under one header',
    showItems(buildRenderItems(book('a:F1 x b:F1 y c:F1'), F1)), '[F1 a b c] x y');

  check('empty inputs are handled', showItems(buildRenderItems([], [])), '');
  check('null-ish inputs are handled', showItems(buildRenderItems(null, null)), '');

  // ── removeFolder ───────────────────────────────────────────────────────────
  const removed = removeFolder(book('a:F1 b c:F1'), F1, 'F1');
  check('removing a folder unfiles its members', show(removed.entries), 'a b c');
  check('removing a folder keeps every entry', removed.entries.length, 3);
  check('removing a folder drops it from the list', removed.folders.length, 0);
  check('removing leaves other folders alone',
    removeFolder(book('a:F1 b:F2'), [folder('F1'), folder('F2')], 'F1').folders.length, 1);

  // ── collapse cycle ─────────────────────────────────────────────────────────
  check('cycle full → condensed',      nextCollapseState(COLLAPSE_STATES.FULL),      COLLAPSE_STATES.CONDENSED);
  check('cycle condensed → tucked',    nextCollapseState(COLLAPSE_STATES.CONDENSED), COLLAPSE_STATES.TUCKED);
  check('cycle tucked → full (wraps)', nextCollapseState(COLLAPSE_STATES.TUCKED),    COLLAPSE_STATES.FULL);
  check('unknown state falls back to the head of the cycle',
    nextCollapseState('nonsense'), COLLAPSE_STATES.FULL);

  // ── small helpers ──────────────────────────────────────────────────────────
  check('createFolder mints a distinct id', createFolder([]).id !== createFolder([]).id, true);
  check('createFolder advances order', createFolder([folder('F1', { order: 4 })]).order, 5);
  check('createFolder picks the next swatch',
    createFolder([]).color !== createFolder([folder('F1')]).color, true);
  check('updateFolder patches only the target',
    updateFolder([folder('F1'), folder('F2')], 'F1', { name: 'X' }).map((f) => f.name).join(','), 'X,F2');
  check('updateFolder on a missing id changes nothing',
    updateFolder([folder('F1')], 'nope', { name: 'X' })[0].name, 'F1');
  check('countEntriesInFolder counts members', countEntriesInFolder(book('a:F1 b c:F1'), 'F1'), 2);
  check('getFolder finds by id', getFolder(F1, 'F1')?.id, 'F1');
  check('getFolder is null for a dangling id', getFolder(F1, 'GONE'), null);
  check('getFolder is null for no id', getFolder(F1, null), null);
  check('isFiledIn requires the folder to exist',
    isFiledIn({ folderId: 'GONE' }, F1, 'GONE'), false);
  check('isFiledIn is true for a real folder',
    isFiledIn({ folderId: 'F1' }, F1, 'F1'), true);
  check('foldersOf tolerates a book saved before folders existed',
    foldersOf({ entries: [] }).length, 0);
  check('foldersOf tolerates no book at all', foldersOf(null).length, 0);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} folder-tree checks passed`);
  return results.every(Boolean);
}

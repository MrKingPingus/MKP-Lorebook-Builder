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
  flattenRenderItems,
  foldersOf,
  depthOf,
  childFoldersOf,
  subtreeFolderIds,
  subtreeHeight,
  canNest,
  eligibleParents,
  gatherSubtree,
  setFolderParent,
  effectiveCollapseState,
  clampCollapseState,
  pruneFolderFilter,
  filterEntriesByFolders,
  folderFilterEntryIds,
  folderFilterOptions,
} from '../src/services/folder-tree.js';
import {
  COLLAPSE_STATES,
  MAX_FOLDER_DEPTH,
  COLLAPSE_STAGE_ORDER,
  DEFAULT_COLLAPSE_STAGES,
  normalizeCollapseStages,
  UNFILED_FILTER_ID,
} from '../src/constants/folders.js';
import { folderOrderFor } from '../src/constants/sort-modes.js';

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

// Render the walk output as shorthand. '[F1 a c] b' = folder F1 holding a and
// c, then loose entry b. Nesting shows as nesting: '[P a [C b]]'.
function showItems(items) {
  return (items ?? []).map((item) => (
    item.kind === 'folder'
      ? `[${item.folder.id}${item.children.length ? ' ' + showItems(item.children) : ''}]`
      : item.entry.id
  )).join(' ');
}

// Folder shorthand with a parent: nest('C', 'P') = folder C inside folder P.
function nest(id, parentId, overrides = {}) {
  return folder(id, { parentId, ...overrides });
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
    flattenRenderItems(buildRenderItems(book('a:F1 b c:F1 d'), F1)).length, 4);

  // An id with no matching folder must read as top-level — that's what stops a
  // history undo that removed a folder from orphaning its entries. `a` points
  // at a folder that no longer exists, so it renders as a loose entry; F1 leads
  // as an empty folder.
  check('dangling folderId renders top-level',
    showItems(buildRenderItems(book('a:GONE b'), F1)), '[F1] a b');
  check('dangling folderId is not swallowed by a real folder',
    showItems(buildRenderItems(book('a:GONE b:F1'), F1)), 'a [F1 b]');

  // An empty folder has no member to anchor to, so it LEADS its level — a
  // folder you just made lands at the top, where you're already looking.
  check('empty folder leads the list',
    showItems(buildRenderItems(book('a b'), F1)), '[F1] a b');
  check('empty folders lead newest-first',
    showItems(buildRenderItems(book('a'), [folder('F2', { order: 2 }), folder('F1', { order: 1 })])),
    '[F2] [F1] a');
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

  // ── nesting: tree shape ────────────────────────────────────────────────────
  const PC = [folder('P'), nest('C', 'P')];

  check('a parent renders its child inside it',
    showItems(buildRenderItems(book('a:P b:C'), PC)), '[P a [C b]]');

  check('a parent with no entries of its own still anchors to its subtree',
    showItems(buildRenderItems(book('x a:C y'), PC)), 'x [P [C a]] y');

  check('loose entries stay interleaved around a nested tree',
    showItems(buildRenderItems(book('x a:P y b:C'), PC)), 'x [P a [C b]] y');

  check('three levels render',
    showItems(buildRenderItems(book('a:G'), [folder('P'), nest('C', 'P'), nest('G', 'C')])),
    '[P [C [G a]]]');

  check('subtree entries all survive the walk',
    flattenRenderItems(buildRenderItems(book('a:P b:C x'), PC)).length, 3);

  check('header count is the whole subtree, not just direct members',
    buildRenderItems(book('a:P b:C'), PC)[0].totalCount, 2);
  check('direct count stays separate',
    buildRenderItems(book('a:P b:C'), PC)[0].count, 1);

  check('an empty nested tree leads the list',
    showItems(buildRenderItems(book('a'), PC)), '[P [C]] a');
  check('hideEmptyFolders drops an empty subtree whole',
    showItems(buildRenderItems(book('a'), PC, { hideEmptyFolders: true })), 'a');
  check('hideEmptyFolders keeps a parent whose child has a match',
    showItems(buildRenderItems(book('a:C'), PC, { hideEmptyFolders: true })), '[P [C a]]');

  // A parentId pointing at a folder that no longer exists reads as top level,
  // the same tolerance dangling entry.folderId gets.
  check('dangling parentId renders the child at top level',
    showItems(buildRenderItems(book('a:C'), [nest('C', 'GONE')])), '[C a]');

  // ── nesting: depth, ancestry, legality ─────────────────────────────────────
  check('top-level folder is depth 1',  depthOf(PC, 'P'), 1);
  check('nested folder is depth 2',     depthOf(PC, 'C'), 2);
  check('unknown folder is depth 0',    depthOf(PC, 'nope'), 0);
  check('childFoldersOf finds children', childFoldersOf(PC, 'P').map((f) => f.id).join(','), 'C');
  check('childFoldersOf(null) is the top level', childFoldersOf(PC, null).map((f) => f.id).join(','), 'P');
  check('subtreeFolderIds includes the root', subtreeFolderIds(PC, 'P').join(','), 'P,C');
  check('subtreeHeight counts levels', subtreeHeight(PC, 'P'), 2);
  check('subtreeHeight of a leaf is 1', subtreeHeight(PC, 'C'), 1);

  check('cannot nest a folder into itself', canNest(PC, 'P', 'P'), false);
  check('cannot nest a parent into its own child', canNest(PC, 'P', 'C'), false);
  check('can nest a sibling in', canNest([...PC, folder('S')], 'S', 'C'), true);
  check('unparenting to top level is always allowed', canNest(PC, 'C', null), true);

  // The depth cap counts the moved subtree's own height, not just the target.
  const deep = [folder('P'), nest('C', 'P'), nest('G', 'C'), folder('S'), nest('S2', 'S')];
  check(`cap is ${MAX_FOLDER_DEPTH}`, MAX_FOLDER_DEPTH, 3);
  check('cannot nest below the deepest allowed level', canNest(deep, 'S', 'G'), false);
  check('cannot nest a 2-tall subtree under a depth-2 folder', canNest(deep, 'S', 'C'), false);
  check('can nest a 1-tall folder under a depth-2 folder', canNest(deep, 'S2', 'C'), true);
  check('eligibleParents excludes self and descendants',
    eligibleParents(PC, 'P').map((f) => f.id).join(','), '');
  check('eligibleParents offers a legal target',
    eligibleParents([...PC, folder('S')], 'S').map((f) => f.id).sort().join(','), 'C,P');

  // ── nesting: subtree contiguity ────────────────────────────────────────────
  check('gathering pulls a scattered subtree together',
    show(gatherSubtree(book('a:P x b:C y'), PC, 'P')), 'a:P b:C x y');
  check('gathering anchors at the earliest member',
    show(gatherSubtree(book('x a:P y b:C'), PC, 'P')), 'x a:P b:C y');
  check('gathering orders parent members before child members',
    show(gatherSubtree(book('b:C a:P'), PC, 'P')), 'a:P b:C');
  check('gathering an empty subtree is a no-op',
    show(gatherSubtree(book('a b'), PC, 'P')), 'a b');

  const reparented = setFolderParent(book('a:P x b:S y'), [folder('P'), folder('S')], 'S', 'P');
  check('re-parenting sets the parent', reparented.folders.find((f) => f.id === 'S').parentId, 'P');
  check('re-parenting gathers the subtree', show(reparented.entries), 'a:P b:S x y');
  check('an illegal re-parent returns null', setFolderParent(book('a:P'), PC, 'P', 'C'), null);

  // Un-nesting re-gathers the tree the folder left, so the old parent doesn't
  // keep a hole where the child's entries used to sit.
  const unnested = setFolderParent(book('a:P b:C x'), PC, 'C', null);
  check('un-nesting clears the parent', unnested.folders.find((f) => f.id === 'C').parentId, null);
  check('un-nesting keeps both trees contiguous', show(unnested.entries), 'a:P b:C x');

  // Moving between two trees gathers both.
  const twoTrees = [folder('P'), nest('C', 'P'), folder('Q')];
  const moved = setFolderParent(book('a:P x b:C y c:Q'), twoTrees, 'C', 'Q');
  check('moving between trees re-parents', moved.folders.find((f) => f.id === 'C').parentId, 'Q');
  check('moving between trees gathers both', show(moved.entries), 'a:P x y c:Q b:C');

  // ── nesting: inherited collapse ────────────────────────────────────────────
  check('a child inherits a condensed ancestor',
    effectiveCollapseState(COLLAPSE_STATES.CONDENSED, COLLAPSE_STATES.FULL), COLLAPSE_STATES.CONDENSED);
  check('a child keeps its own state when it is more collapsed',
    effectiveCollapseState(COLLAPSE_STATES.CONDENSED, COLLAPSE_STATES.TUCKED), COLLAPSE_STATES.TUCKED);
  check('nothing inherited leaves the child alone',
    effectiveCollapseState(COLLAPSE_STATES.FULL, COLLAPSE_STATES.CONDENSED), COLLAPSE_STATES.CONDENSED);
  check('a tucked ancestor outranks everything',
    effectiveCollapseState(COLLAPSE_STATES.TUCKED, COLLAPSE_STATES.FULL), COLLAPSE_STATES.TUCKED);

  // ── configurable collapse cycle ────────────────────────────────────────────
  const TWO   = DEFAULT_COLLAPSE_STAGES;
  const THREE = COLLAPSE_STAGE_ORDER;

  check('three-stage cycle passes through condensed',
    nextCollapseState(COLLAPSE_STATES.FULL, THREE), COLLAPSE_STATES.CONDENSED);
  check('two-stage cycle skips condensed',
    nextCollapseState(COLLAPSE_STATES.FULL, TWO), COLLAPSE_STATES.TUCKED);
  check('two-stage wraps back to full',
    nextCollapseState(COLLAPSE_STATES.TUCKED, TWO), COLLAPSE_STATES.FULL);
  // A folder left condensed when the user switched to two stages must move on
  // rather than sticking on a state the cycle no longer offers.
  check('a state outside the cycle advances to its head',
    nextCollapseState(COLLAPSE_STATES.CONDENSED, TWO), COLLAPSE_STATES.FULL);

  // Clamping is a render-time view, never a write — switching back restores.
  check('two stages render a condensed folder as full',
    clampCollapseState(COLLAPSE_STATES.CONDENSED, TWO), COLLAPSE_STATES.FULL);
  check('two stages leave tucked alone',
    clampCollapseState(COLLAPSE_STATES.TUCKED, TWO), COLLAPSE_STATES.TUCKED);
  check('three stages leave condensed alone',
    clampCollapseState(COLLAPSE_STATES.CONDENSED, THREE), COLLAPSE_STATES.CONDENSED);

  // ── removeFolder ───────────────────────────────────────────────────────────
  const removed = removeFolder(book('a:F1 b c:F1'), F1, 'F1');
  check('removing a folder unfiles its members', show(removed.entries), 'a b c');
  check('removing a folder keeps every entry', removed.entries.length, 3);
  check('removing a folder drops it from the list', removed.folders.length, 0);
  // Deleting never destroys a subtree: children rise to the deleted folder's
  // own parent, so a middle deletion leaves them inside the grandparent.
  const G = [folder('P'), nest('C', 'P'), nest('X', 'C')];
  const midGone = removeFolder(book('a:X'), G, 'C');
  check('deleting a middle folder promotes its children to the grandparent',
    midGone.folders.find((f) => f.id === 'X').parentId, 'P');
  check('deleting a middle folder keeps the rest of the tree', midGone.folders.length, 2);
  check('deleting a top folder promotes its children to top level',
    removeFolder(book('a:C'), PC, 'P').folders.find((f) => f.id === 'C').parentId, null);
  check('deleting never loses an entry', removeFolder(book('a:X b'), G, 'C').entries.length, 2);

  check('removing leaves other folders alone',
    removeFolder(book('a:F1 b:F2'), [folder('F1'), folder('F2')], 'F1').folders.length, 1);

  // ── collapse cycle ─────────────────────────────────────────────────────────
  // The *default* cycle is now open-or-shut, so these skip condensed. The
  // three-stage cycle is still available and checked just below.
  check('default cycle full → tucked',      nextCollapseState(COLLAPSE_STATES.FULL),   COLLAPSE_STATES.TUCKED);
  check('default cycle tucked → full (wraps)', nextCollapseState(COLLAPSE_STATES.TUCKED), COLLAPSE_STATES.FULL);
  check('a condensed folder rejoins the default cycle at the head',
    nextCollapseState(COLLAPSE_STATES.CONDENSED), COLLAPSE_STATES.FULL);
  check('unknown state falls back to the head of the cycle',
    nextCollapseState('nonsense'), COLLAPSE_STATES.FULL);

  const ALL3 = COLLAPSE_STAGE_ORDER;
  check('three-stage cycle full → condensed',
    nextCollapseState(COLLAPSE_STATES.FULL, ALL3),      COLLAPSE_STATES.CONDENSED);
  check('three-stage cycle condensed → tucked',
    nextCollapseState(COLLAPSE_STATES.CONDENSED, ALL3), COLLAPSE_STATES.TUCKED);
  check('three-stage cycle tucked → full (wraps)',
    nextCollapseState(COLLAPSE_STATES.TUCKED, ALL3),    COLLAPSE_STATES.FULL);

  // ── folder filter ──────────────────────────────────────────────────────────
  // The filter is an entry-level predicate, but it reads the folder *tree*:
  // selecting a parent has to pull in everything nested under it, and a
  // selection that no longer names a real folder has to degrade to "no filter"
  // rather than to "no results".
  {
    const nest = [folder('P'), folder('C', { parentId: 'P' })];
    const b    = book('a:P b c:C d');

    const ids = (list) => list.map((e) => e.id).join(' ');

    check('no selection filters nothing', ids(filterEntriesByFolders(b, nest, [])), 'a b c d');
    check('selecting a leaf folder keeps only its members',
      ids(filterEntriesByFolders(b, nest, ['C'])), 'c');
    check('selecting a parent pulls in the whole subtree',
      ids(filterEntriesByFolders(b, nest, ['P'])), 'a c');
    check('selecting parent and child does not duplicate',
      ids(filterEntriesByFolders(b, nest, ['P', 'C'])), 'a c');
    check('unfiled selects entries outside every folder',
      ids(filterEntriesByFolders(b, nest, [UNFILED_FILTER_ID])), 'b d');
    check('unfiled combines with a folder',
      ids(filterEntriesByFolders(b, nest, ['C', UNFILED_FILTER_ID])), 'b c d');
    check('filtering preserves list order, it does not regroup',
      ids(filterEntriesByFolders(book('a:P b c:C d'), nest, ['P', UNFILED_FILTER_ID])), 'a b c d');

    // An entry pointing at a folder that no longer exists is unfiled, by the
    // same rule buildRenderItems uses — a dangling folderId renders top-level.
    check('an entry with a dangling folderId counts as unfiled',
      ids(filterEntriesByFolders(book('a:GONE b'), nest, [UNFILED_FILTER_ID])), 'a b');

    // Pruning is the whole safety story for deletion and for crosstalk role
    // swaps: the ids simply stop existing, so the filter stops constraining.
    check('pruning drops ids with no folder', pruneFolderFilter(nest, ['P', 'GONE']).join(','), 'P');
    check('pruning keeps the unfiled sentinel',
      pruneFolderFilter(nest, [UNFILED_FILTER_ID]).join(','), UNFILED_FILTER_ID);
    check('pruning tolerates no folders at all', pruneFolderFilter([], ['P']).length, 0);
    check('a fully stale selection filters nothing',
      ids(filterEntriesByFolders(b, nest, ['GONE', 'ALSO-GONE'])), 'a b c d');
    // Crosstalk role swap: the selection still carries the other book's ids
    // while `folders` is now the current book's. Pruning empties the selection,
    // so the pane shows everything instead of going blank.
    check('a selection from another book filters nothing',
      ids(filterEntriesByFolders(b, nest, ['OTHER-BOOK-FOLDER'])), 'a b c d');
    // Distinct from the above: a folder that really exists but holds nothing
    // filters to nothing, which is the honest answer.
    check('selecting a genuinely empty folder yields nothing',
      ids(filterEntriesByFolders(b, [...nest, folder('EMPTY')], ['EMPTY'])), '');

    check('folderFilterEntryIds returns a set of the subtree', folderFilterEntryIds(b, nest, ['P']).size, 2);

    // Menu options walk the tree in render order and carry subtree counts, so
    // the number beside a parent matches what selecting it would show.
    const opts = folderFilterOptions(b, nest);
    check('menu lists every folder', opts.map((o) => o.id).join(' '), 'P C');
    check('menu carries nesting depth', opts.map((o) => o.depth).join(','), '0,1');
    check('menu count is the whole subtree', opts.find((o) => o.id === 'P').count, 2);
    check('menu is empty with no folders', folderFilterOptions(b, []).length, 0);
  }

  // ── folder order under sorts ───────────────────────────────────────────────
  // Anchoring reads member position, which is right for manual order and for
  // last-modified but wrong under alpha: a folder named Zeta holding Apple
  // would sit above a loose Beta. Alpha modes sort folder rows by folder name.
  {
    const zeta = [folder('Zeta')];
    const b    = [
      { id: 'apple', name: 'Apple', folderId: 'Zeta' },
      { id: 'beta',  name: 'Beta',  folderId: null   },
    ];

    check('position order anchors the folder at its first member',
      showItems(buildRenderItems(b, zeta)), '[Zeta apple] beta');
    check('name-asc sorts the folder by its own name',
      showItems(buildRenderItems(b, zeta, { orderBy: 'name-asc' })), 'beta [Zeta apple]');
    check('name-desc reverses it',
      showItems(buildRenderItems(b, zeta, { orderBy: 'name-desc' })), '[Zeta apple] beta');

    // Entries inside a folder sort by name too, at their own level.
    const inner = [
      { id: 'c', name: 'Cherry', folderId: 'Zeta' },
      { id: 'a', name: 'Apple',  folderId: 'Zeta' },
    ];
    check('name-asc sorts inside a folder as well',
      showItems(buildRenderItems(inner, zeta, { orderBy: 'name-asc' })), '[Zeta a c]');

    // An empty folder has a name, so under alpha it takes its alphabetical
    // place rather than jumping to the top the way position order needs.
    const withEmpty = [folder('Mango', { order: 1 }), folder('Zzz', { order: 2 })];
    check('empty folders lead under position order',
      showItems(buildRenderItems([{ id: 'b', name: 'Beta', folderId: null }], withEmpty)),
      '[Zzz] [Mango] b');
    check('empty folders sort by name under alpha',
      showItems(buildRenderItems([{ id: 'b', name: 'Beta', folderId: null }], withEmpty, { orderBy: 'name-asc' })),
      'b [Mango] [Zzz]');

    check('folderOrderFor maps alpha-asc', folderOrderFor('alpha-asc'), 'name-asc');
    check('folderOrderFor maps alpha-desc', folderOrderFor('alpha-desc'), 'name-desc');
    check('folderOrderFor leaves default alone', folderOrderFor('default'), 'position');
    check('folderOrderFor leaves last-modified anchored', folderOrderFor('last-modified'), 'position');
    check('folderOrderFor tolerates an unknown mode', folderOrderFor('nope'), 'position');

    // Filtering and ordering compose: no entry may be lost or duplicated.
    const all = flattenRenderItems(buildRenderItems(b, zeta, { orderBy: 'name-asc' }));
    check('alpha ordering keeps every entry exactly once', all.map((e) => e.id).sort().join(' '), 'apple beta');
  }

  // ── collapse stage sets ────────────────────────────────────────────────────
  // The setting moved from a two-value dropdown to a set of checkboxes. The
  // read has to stay tolerant: old stored values, partial arrays and junk all
  // have to resolve to a usable cycle, and a cycle is only usable if it has
  // 'full' plus at least one other stage.
  {
    const j = (v) => normalizeCollapseStages(v).join(',');
    const F = COLLAPSE_STATES.FULL, C = COLLAPSE_STATES.CONDENSED, T = COLLAPSE_STATES.TUCKED;

    check('the default is open-or-shut', DEFAULT_COLLAPSE_STAGES.join(','), `${F},${T}`);
    check('legacy "three" still means all three stages', j('three'), `${F},${C},${T}`);
    check('legacy "two" still means full and hidden', j('two'), `${F},${T}`);
    check('an explicit set is honoured', j([F, C]), `${F},${C}`);
    check('order is canonical regardless of input order', j([T, C, F]), `${F},${C},${T}`);
    check('full is added back if omitted', j([C]), `${F},${C}`);
    check('a set with only full falls back to the default', j([F]), `${F},${T}`);
    check('an empty set falls back to the default', j([]), `${F},${T}`);
    check('junk falls back to the default', j('nonsense'), `${F},${T}`);
    check('undefined falls back to the default', j(undefined), `${F},${T}`);
    check('unknown states are ignored', j([F, 'bogus', T]), `${F},${T}`);

    // A normalised cycle is always usable by the two functions that consume it.
    for (const input of ['three', 'two', [C], [], 'junk', [T]]) {
      const cycle = normalizeCollapseStages(input);
      const ok = cycle.length >= 2 && cycle.includes(F)
        && cycle.includes(nextCollapseState(F, cycle))
        && cycle.includes(clampCollapseState(C, cycle));
      check(`cycle from ${JSON.stringify(input)} is usable`, ok, true);
    }
  }

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

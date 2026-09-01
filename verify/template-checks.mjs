// Pure-logic checks for services/template-service.js and the tree it shares
// with folders (services/category-tree.js).
//
// Two things here are worth guarding rather than merely testing.
//
// The **content-driven checklist** is what makes saving a template a one-press
// action: there is no field menu at save time, so the load has to work out for
// itself what a template can contribute. Get `fieldHasContent` wrong and either
// a description-only scaffold starts asking questions it has no business
// asking, or a template silently declines to load a field it holds.
//
// The **category tree is now shared with entry folders**, so every assertion
// about cycles and depth is doing double duty — folder-tree.js binds the same
// functions. `folder-tree-checks.mjs` covers that side; these cover the shape
// itself, at a different depth cap, which is the part the extraction made
// configurable and therefore the part that can regress.
import {
  templateFromEntry, applyTemplate, contentFields, needsChecklist,
  fieldHasContent, descriptionWouldCollide, templatesInCategory, templatePreview,
} from '../src/services/template-service.js';
import * as tree from '../src/services/category-tree.js';
import { DESCRIPTION_APPEND, DESCRIPTION_OVERWRITE } from '../src/constants/templates.js';

function entry(over = {}) {
  return {
    id: 'e1', name: 'Reika', type: 'character',
    triggers: ['reika'], description: 'A photographer.',
    isPublic: true, hiddenFromExport: false, folderId: 'f1',
    snapshots: [{ label: 'old' }],
    ...over,
  };
}

export function runTemplateChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ templates (pure logic)');

  // ── what a template captures, and what it refuses to ──────────────────────
  {
    const t = templateFromEntry(entry(), { name: 'Character scaffold' });
    check('the four content fields travel',
      Object.keys(t.payload).sort(), ['description', 'name', 'triggers', 'type']);
    check('publishing state does NOT — a template must not silently hide an entry from export',
      [t.payload.isPublic, t.payload.hiddenFromExport], [undefined, undefined]);
    check('nor does the source folder or its checkpoints',
      [t.payload.folderId, t.payload.snapshots], [undefined, undefined]);
    check('the name falls back to the entry\'s own',
      templateFromEntry(entry()).name, 'Reika');
    check('and to a placeholder when the entry has none either',
      templateFromEntry(entry({ name: '' })).name, 'Untitled template');
    check('triggers are copied, not shared — editing the entry later cannot rewrite a saved template',
      t.payload.triggers === entry().triggers, false);
    check('a missing entry is null, not a crash', templateFromEntry(null), null);
  }

  // ── the content-driven checklist ──────────────────────────────────────────
  {
    const full = templateFromEntry(entry());
    check('a full entry offers every field',
      contentFields(full), ['name', 'type', 'triggers', 'description']);

    const descOnly = templateFromEntry(entry({ name: '', type: '', triggers: [] }));
    check('a description-only template offers only that',
      contentFields(descOnly), ['description']);
    check('and skips the checklist entirely (locked decision 3)',
      needsChecklist(descOnly), false);
    check('while anything else asks', needsChecklist(full), true);

    check('whitespace is not content', fieldHasContent({ name: '   ' }, 'name'), false);
    check('an empty trigger list is not content', fieldHasContent({ triggers: [] }, 'triggers'), false);
    check('but one trigger is', fieldHasContent({ triggers: ['a'] }, 'triggers'), true);
  }

  // ── applying it ───────────────────────────────────────────────────────────
  {
    const t = templateFromEntry(entry({ name: 'Scaffold', triggers: ['alias', 'nickname'] }));
    const target = entry({ id: 'e2', name: '', description: '', triggers: ['reika'] });

    const patch = applyTemplate(t, target);
    check('an empty description takes the template\'s text', patch.description, 'A photographer.');
    // Triggers are additive by nature — a `name / alias / nickname` scaffold is
    // meant to EXTEND what is there, not replace it.
    check('triggers union rather than replace', patch.triggers, ['reika', 'alias', 'nickname']);

    const dupes = applyTemplate(
      templateFromEntry(entry({ triggers: ['REIKA'] })),
      entry({ description: '' }),
    );
    check('and de-duplicate case-insensitively', dupes.triggers, undefined);

    check('only the ticked fields land',
      Object.keys(applyTemplate(t, target, { fields: ['description'] })), ['description']);
    check('a patch that would change nothing is null, so no undo step is pushed',
      applyTemplate(templateFromEntry(entry({ name: '', type: '', triggers: [], description: '' })),
        target), null);
    check('a missing template is null', applyTemplate(null, target), null);
  }

  // ── the description conflict (locked decision 4) ──────────────────────────
  {
    const t   = templateFromEntry(entry({ description: 'TEMPLATE TEXT' }));
    const has = entry({ description: 'Already written.' });

    check('a collision is only reported when there is text to lose',
      descriptionWouldCollide(t, has), true);
    check('an empty description is not a collision — the prompt must not appear',
      descriptionWouldCollide(t, entry({ description: '' })), false);
    check('nor is one when description is unticked',
      descriptionWouldCollide(t, has, ['name']), false);

    check('overwrite replaces',
      applyTemplate(t, has, { descriptionMode: DESCRIPTION_OVERWRITE }).description,
      'TEMPLATE TEXT');
    check('append keeps what was there, separated',
      applyTemplate(t, has, { descriptionMode: DESCRIPTION_APPEND }).description,
      'Already written.\n\nTEMPLATE TEXT');
  }

  // ── listing ───────────────────────────────────────────────────────────────
  {
    const list = [
      { id: 'a', categoryId: null, updatedAt: 1 },
      { id: 'b', categoryId: 'c1', updatedAt: 3 },
      { id: 'c', categoryId: 'c1', updatedAt: 2 },
    ];
    check('a category lists its own, newest first',
      templatesInCategory(list, 'c1').map((t) => t.id), ['b', 'c']);
    check('and null lists the uncategorized',
      templatesInCategory(list, null).map((t) => t.id), ['a']);
    check('a long preview is elided',
      templatePreview({ payload: { description: 'x'.repeat(300) } }, 10).length, 10);
    check('an empty one is empty, not "…"',
      templatePreview({ payload: { description: '' } }), '');
  }

  // ── the shared tree, at a cap folders do not use ──────────────────────────
  {
    const nodes = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: 'c' },
    ];
    check('depth counts from 1', tree.depthOf(nodes, 'd'), 4);
    check('a subtree includes its root', tree.subtreeIds(nodes, 'b'), ['b', 'c', 'd']);
    check('height is levels, not nodes', tree.subtreeHeight(nodes, 'b'), 3);
    check('a node cannot become its own child', tree.canNest(nodes, 'a', 'a', 4), false);
    check('nor a child of its own descendant', tree.canNest(nodes, 'a', 'c', 4), false);
    check('top level is always legal', tree.canNest(nodes, 'd', null, 4), true);
    // The cap is a parameter now, which is the whole reason the extraction
    // happened — folders cap at 3 for an indent reason a dropdown does not share.
    check('the depth cap is honoured at 4', tree.canNest(nodes, 'b', 'a', 4), true);
    check('and rejects the same move at 3', tree.canNest(nodes, 'b', 'a', 3), false);

    check('a dangling parentId reads as top level',
      tree.parentIdOf([{ id: 'x', parentId: 'gone' }], { id: 'x', parentId: 'gone' }), null);
    check('deleting a middle level re-homes its children rather than hiding them',
      tree.removeNode(nodes, 'b').map((n) => [n.id, n.parentId]),
      [['a', null], ['c', 'a'], ['d', 'c']]);
    check('a breadcrumb runs root to node',
      tree.pathTo(nodes, 'c').map((n) => n.id), ['a', 'b', 'c']);
    check('and is empty for nothing', tree.pathTo(nodes, null), []);
    // Corrupt data must not hang the app.
    const cycle = [{ id: 'p', parentId: 'q' }, { id: 'q', parentId: 'p' }];
    check('a cycle in stored data terminates instead of hanging',
      tree.depthOf(cycle, 'p'), 2);
  }

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} template checks passed`);
  return results.every(Boolean);
}

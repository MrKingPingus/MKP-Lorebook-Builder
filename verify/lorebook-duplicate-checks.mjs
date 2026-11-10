// Pure-logic checks for services/lorebook-duplicate.js (#137).
import { duplicateLorebook } from '../src/services/lorebook-duplicate.js';

export function runLorebookDuplicateChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ lorebook duplicate (pure logic)');

  const source = {
    id: 'src', name: 'Reika', placeholder: true,
    hostId: 'lb_123', hostSyncedAt: 99, hostPending: true,
    allowedOverlaps: ['ice'],
    rollback: { enabled: true, snapshotCount: 5, autoSnapshot: false },
    folders: [
      { id: 'f-top', name: 'Cast', parentId: null },
      { id: 'f-sub', name: 'Villains', parentId: 'f-top' },
    ],
    entries: [
      { id: 'e1', name: 'A', triggers: ['a'], folderId: 'f-sub', snapshots: [{ label: 'cp' }], lastModified: 5, alwaysOn: true, triggerCondition: 'when' },
      { id: 'e2', name: 'B', triggers: ['b'], folderId: null, snapshots: [], lastModified: 6 },
    ],
  };
  const copy = duplicateLorebook(source, { name: 'Reika (copy)' });

  check('takes the given name', copy.name, 'Reika (copy)');
  check('gets its own id', copy.id !== source.id && !!copy.id, true);
  check('drops every CharSnap link field — a copy must never save over the original',
    Object.keys(copy).filter((k) => k.startsWith('host')), []);
  check('drops the placeholder marker', 'placeholder' in copy, false);
  check('keeps every entry, in order', copy.entries.map((e) => e.name), ['A', 'B']);
  check('with new entry ids', copy.entries.some((e) => e.id === 'e1' || e.id === 'e2'), false);
  check('and new folder ids', copy.folders.some((f) => f.id === 'f-top' || f.id === 'f-sub'), false);
  check('nesting survives the remap', copy.folders[1].parentId, copy.folders[0].id);
  check('entries stay filed in the copied folder', copy.entries[0].folderId, copy.folders[1].id);
  check('an unfiled entry stays unfiled', copy.entries[1].folderId, null);
  check('checkpoints come along', copy.entries[0].snapshots, [{ label: 'cp' }]);
  check('as a separate array', copy.entries[0].snapshots !== source.entries[0].snapshots, true);
  check('CharSnap fields on entries come along', [copy.entries[0].alwaysOn, copy.entries[0].triggerCondition], [true, 'when']);
  check('lastModified is untouched — nothing about the entry changed', copy.entries[0].lastModified, 5);
  check('allowed overlaps come along', copy.allowedOverlaps, ['ice']);
  check('as a separate array', copy.allowedOverlaps !== source.allowedOverlaps, true);
  check('checkpoint settings come along', copy.rollback, source.rollback);
  check('the source is not modified', [source.entries[0].id, source.folders[0].id, source.hostId], ['e1', 'f-top', 'lb_123']);
  check('no source → null', duplicateLorebook(null), null);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} lorebook-duplicate checks passed`);
  return results.every(Boolean);
}

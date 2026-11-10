// Pure-logic checks for the "export everything" backup (#129): the archive
// round trip through the real zip builder and reader, and the restore helpers.
import { buildBackupFiles, parseBackupFiles, restoredName, mergeTemplates } from '../src/services/backup-archive.js';
import { buildZip } from '../src/services/zip-builder.js';
import { readZip }  from '../src/services/zip-reader.js';

export async function runBackupArchiveChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ backup archive (pure logic)');

  const books = [
    {
      id: 'a', name: 'Reika: V2 / draft?', folders: [{ id: 'f1', name: 'Cast', parentId: null }],
      allowedOverlaps: ['ice'], rollback: { enabled: true, snapshotCount: 3 },
      entries: [
        { id: 'e1', name: 'Shown', type: 'character', triggers: ['a'], description: 'd', folderId: 'f1', snapshots: [{ label: 'cp' }] },
        { id: 'e2', name: 'Hidden', type: 'item', triggers: [], description: '', hiddenFromExport: true, snapshots: [] },
      ],
    },
    { id: 'b', name: '', entries: [] },
    { id: 'tour', name: 'Sample', ephemeral: true, entries: [] },
  ];
  const settings  = { warningScale: 'four' };
  const templates = { templates: [{ id: 't1', name: 'Sheet' }], categories: [] };
  const files = buildBackupFiles({ lorebooks: books, settings, templates, appVersion: '0.11.0', now: Date.UTC(2026, 10, 10) });
  const names = files.map((f) => f.name);

  check('one portable and one full file per stored book, plus the rest', names, [
    'backup.json', 'READ-ME.txt',
    'lorebooks/01-Reika V2 draft.json', 'lorebooks/02-Untitled.json',
    'builder-data/01-Reika V2 draft.json', 'builder-data/02-Untitled.json',
    'builder-data/settings.json', 'builder-data/templates.json',
  ]);
  check('an ephemeral book (the tour\'s samples) is never backed up', names.some((n) => n.includes('Sample')), false);
  const portable = JSON.parse(files.find((f) => f.name === 'lorebooks/01-Reika V2 draft.json').data);
  check('the portable copy is an ordinary export: hidden entries left out',
    Object.values(portable.entries).map((e) => e.name), ['Shown']);

  // Through the real zip, as bytes, and back.
  const zipped = await new Response(buildZip(files)).arrayBuffer();
  const back   = parseBackupFiles(await readZip(zipped));
  check('the round trip keeps every book', back.lorebooks.map((b) => b.name), ['Reika: V2 / draft?', '']);
  check('with hidden entries, which an export would drop', back.lorebooks[0].entries.map((e) => e.name), ['Shown', 'Hidden']);
  check('folders', back.lorebooks[0].folders, books[0].folders);
  check('checkpoints', back.lorebooks[0].entries[0].snapshots, [{ label: 'cp' }]);
  check('checkpoint settings and allowed overlaps', [back.lorebooks[0].rollback, back.lorebooks[0].allowedOverlaps], [books[0].rollback, ['ice']]);
  check('settings', back.settings, settings);
  check('templates', back.templates, templates);
  check('and says when and by what it was made', [back.createdAt, back.appVersion], ['2026-11-10T00:00:00.000Z', '0.11.0']);

  // What is not a backup is refused, in words fit to show.
  const refuses = async (fn) => { try { await fn(); return ''; } catch (e) { return e.message; } };
  check('a zip that is not ours is refused',
    (await refuses(() => parseBackupFiles([{ name: 'word/document.xml', data: '<x/>' }]))).includes('not a Lorebook Builder backup'), true);
  check('a file that is not a zip is refused',
    (await refuses(() => readZip(new TextEncoder().encode('{"name":"just json"}').buffer))).includes('not a zip'), true);
  check('a backup from a newer format is refused rather than half-read',
    (await refuses(() => parseBackupFiles([{ name: 'backup.json', data: JSON.stringify({ format: 'mkp-lorebook-builder-backup', version: 99 }) }]))).includes('newer version'), true);

  check('a free name is kept', restoredName('Reika', ['Other']), 'Reika');
  check('a taken name is marked restored', restoredName('Reika', ['reika']), 'Reika (restored)');
  check('and numbered after that', restoredName('Reika', ['Reika', 'Reika (restored)']), 'Reika (restored 2)');

  const merged = mergeTemplates(
    { templates: [{ id: 't1', name: 'Mine' }], categories: [{ id: 'c1' }] },
    { templates: [{ id: 't1', name: 'Theirs' }, { id: 't2', name: 'New' }], categories: [{ id: 'c1' }, { id: 'c2' }] },
  );
  check('merging templates adds the new and keeps mine where ids match',
    merged.templates.map((t) => t.name), ['Mine', 'New']);
  check('likewise categories', merged.categories.map((c) => c.id), ['c1', 'c2']);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} backup-archive checks passed`);
  return results.every(Boolean);
}

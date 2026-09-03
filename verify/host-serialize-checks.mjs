// Pure-logic checks for host mode's data layer — no browser, no dev server.
//
//   host-serialize.js  — the wire ⇄ builder mapping and the content hash that
//                        decides "dirty". Wrong here and a draft either never
//                        saves or silently rewrites the user's text.
//   host-limits.js     — the pre-flight validator, which has to agree with
//                        what CharSnap rejects.
//   host-bridge.js     — origin / source / envelope filtering, which is the
//                        whole security story for the iframe.
//   lorebook-index.js  — the eviction pick when storage is full.
import { toHostPayload, fromHostPayload, contentHash } from '../src/services/host-serialize.js';
import { validateForHost } from '../src/services/host-limits.js';
import { isHostMessage, detectHostMode } from '../src/services/host-bridge.js';
import { evictOldestHostDraft } from '../src/services/lorebook-index.js';
import { HOST_LIMITS, HOST_ORIGINS } from '../src/constants/host.js';

// The characters a file importer rewrites (unescape-import.js): every one of
// them must survive a host round trip untouched.
const NASTY = 'Marked \\*important\\* — "quoted", it\'s C:\\Users\\path \\(paren\\) \\\\ done';

function entry(overrides = {}) {
  return {
    id: 'e-' + Math.random().toString(36).slice(2, 8),
    name: 'Ashfall Keep',
    type: 'location',
    triggers: ['keep', 'fortress'],
    description: 'A basalt fortress.',
    lastModified: 1,
    ignoreLimitWarnings: { description: false, triggers: false },
    isPublic: true,
    hiddenFromExport: false,
    folderId: null,
    snapshots: [],
    ...overrides,
  };
}

function book(overrides = {}) {
  return {
    id: 'lb-local',
    name: 'Harness Sample',
    entries: [
      entry({ name: 'Ashfall Keep', folderId: 'f1', description: NASTY }),
      entry({ name: 'Mara Vell', type: 'character', triggers: ['mara'], isPublic: false }),
      entry({ name: 'The Ember Rite', type: 'plot_event', triggers: ['rite'], hiddenFromExport: true }),
    ],
    folders: [{ id: 'f1', name: 'Places', color: '#fbbf24', parentId: null, collapseState: 'full', order: 1 }],
    allowedOverlaps: ['keep'],
    rollback: { enabled: false, snapshotCount: 3, autoSnapshot: true },
    hostId: 'lb_sample',
    ...overrides,
  };
}

// Re-shape a parsed mkp:load into a book so it can be hashed / re-serialised.
function rebuild(parsed, extra = {}) {
  return {
    id: 'lb-other',
    name: parsed.name,
    entries: parsed.entries,
    folders: parsed.folders,
    allowedOverlaps: parsed.allowedOverlaps,
    hostId: parsed.hostId,
    ...extra,
  };
}

export function runHostSerializeChecks() {
  const results = [];
  const check = (label, got, want) => {
    const ok = got === want;
    results.push(ok);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${JSON.stringify(got)} (expect ${JSON.stringify(want)})`);
  };

  console.log('\n▶ host serialize / limits / bridge (pure logic)');

  // ── toHostPayload ──────────────────────────────────────────────────────────
  const out = toHostPayload(book());
  check('hostId is carried', out.hostId, 'lb_sample');
  check('name is carried', out.name, 'Harness Sample');
  check('ALL entries go out, hidden ones included', out.entries.length, 3);
  check('hiddenFromExport → disabled', out.entries[2].disabled, true);
  check('visible entry → disabled false', out.entries[0].disabled, false);
  check('type id → CharSnap label', out.entries[2].entryType, 'PlotEvent');
  check('location label', out.entries[0].entryType, 'Location');
  check('isPublic survives', out.entries[1].isPublic, false);
  check('description goes out verbatim', out.entries[0].description, NASTY);
  check('builderMeta.version is 1', out.builderMeta.version, 1);
  check('folders go out', out.builderMeta.folders.length, 1);
  check('folder collapseState is included on the wire', out.builderMeta.folders[0].collapseState, 'full');
  check('entryMeta is index-aligned with entries', out.builderMeta.entryMeta.length, 3);
  check('entryMeta carries the placement', out.builderMeta.entryMeta[0].folderId, 'f1');
  check('unfiled entry has folderId null', out.builderMeta.entryMeta[1].folderId, null);
  check('allowedOverlaps go out', out.builderMeta.allowedOverlaps.join(','), 'keep');
  check('no builder-internal fields leak',
    Object.keys(out.entries[0]).sort().join(','), 'description,disabled,entryType,isPublic,name,triggers');
  check('a book never saved has hostId null', toHostPayload(book({ hostId: undefined })).hostId, null);
  check('an unknown type id still maps to a label', toHostPayload(book({ entries: [entry({ type: 'bogus' })] })).entries[0].entryType, 'Character');

  // ── fromHostPayload ────────────────────────────────────────────────────────
  const back = fromHostPayload({ ...out, updatedAt: '2026-09-01T00:00:00.000Z' });
  check('round trip parses', back.ok, true);
  check('round trip keeps entry count', back.entries.length, 3);
  check('description comes back verbatim (no unescape)', back.entries[0].description, NASTY);
  check('disabled → hiddenFromExport', back.entries[2].hiddenFromExport, true);
  check('label → type id', back.entries[2].type, 'plot_event');
  check('isPublic comes back', back.entries[0].isPublic, true);
  check('folder placement comes back', back.entries[0].folderId, 'f1');
  check('folders come back', back.folders.length, 1);
  check('folder collapseState comes back', back.folders[0].collapseState, 'full');
  check('allowedOverlaps come back', back.allowedOverlaps.join(','), 'keep');
  check('updatedAt is carried', back.updatedAt, '2026-09-01T00:00:00.000Z');
  check('hostId is carried', back.hostId, 'lb_sample');
  check('entries get fresh builder ids', typeof back.entries[0].id === 'string' && back.entries[0].id.length > 0, true);
  check('entries get the builder-only defaults', Array.isArray(back.entries[0].snapshots), true);

  check('re-serialising the parsed copy gives the same wire payload',
    JSON.stringify(toHostPayload(rebuild(back))), JSON.stringify(out));

  // Tolerances the host relies on.
  const noMeta = fromHostPayload({ hostId: 'x', name: 'N', updatedAt: null, entries: out.entries, builderMeta: null });
  check('builderMeta null is fine', noMeta.ok, true);
  check('…and yields no folders', noMeta.folders.length, 0);
  check('…and every entry unfiled', noMeta.entries.every((e) => e.folderId === null), true);

  const shortMeta = fromHostPayload({ ...out, builderMeta: { ...out.builderMeta, entryMeta: [] } });
  check('entryMeta [] (count changed elsewhere) keeps the folders', shortMeta.folders.length, 1);
  check('…but drops the placements', shortMeta.entries.every((e) => e.folderId === null), true);

  const danglingMeta = fromHostPayload({ ...out, builderMeta: { ...out.builderMeta, folders: [] } });
  check('a placement into a missing folder is dropped', danglingMeta.entries[0].folderId, null);

  const futureMeta = fromHostPayload({ ...out, builderMeta: { version: 2, folders: [{ id: 'z' }] } });
  check('an unknown builderMeta version is ignored, not fatal', futureMeta.ok && futureMeta.folders.length === 0, true);

  check('missing entries reads as empty', fromHostPayload({ hostId: null, name: 'New' }).entries.length, 0);
  check('numeric hostId is stringified', fromHostPayload({ hostId: 42, name: 'N', entries: [] }).hostId, '42');
  check('unknown entryType falls back to character',
    fromHostPayload({ name: 'N', entries: [{ name: 'a', entryType: 'Dragon' }] }).entries[0].type, 'character');
  check('missing name/description read as empty strings',
    fromHostPayload({ name: 'N', entries: [{}] }).entries[0].name + '|' + fromHostPayload({ name: 'N', entries: [{}] }).entries[0].description, '|');

  // Malformed input is refused, never coerced.
  check('non-object payload is rejected', fromHostPayload('nope').ok, false);
  check('array payload is rejected', fromHostPayload([]).ok, false);
  check('entries not an array is rejected', fromHostPayload({ name: 'N', entries: {} }).ok, false);
  check('non-object entry is rejected', fromHostPayload({ name: 'N', entries: ['x'] }).ok, false);
  check('non-string trigger is rejected', fromHostPayload({ name: 'N', entries: [{ triggers: [1] }] }).ok, false);
  check('non-string description is rejected', fromHostPayload({ name: 'N', entries: [{ description: 5 }] }).ok, false);
  check('non-string name is rejected', fromHostPayload({ name: 7, entries: [] }).ok, false);
  check('non-string updatedAt is rejected', fromHostPayload({ name: 'N', updatedAt: 5, entries: [] }).ok, false);
  check('array builderMeta is rejected', fromHostPayload({ name: 'N', entries: [], builderMeta: [] }).ok, false);
  check('a rejection carries a reason', typeof fromHostPayload([]).error, 'string');

  // ── contentHash ────────────────────────────────────────────────────────────
  const base = book();
  const h = contentHash(base);
  check('hash is a hex string', /^[0-9a-f]+$/.test(h), true);
  check('hash is deterministic', contentHash(book()), h);
  check('hash ignores builder ids and timestamps',
    contentHash(book({ id: 'other', entries: base.entries.map((e) => ({ ...e, id: 'z' + e.id, lastModified: 999 })) })), h);
  check('hash survives a host round trip', contentHash(rebuild(fromHostPayload(toHostPayload(base)))), h);
  check('hash ignores folder collapseState',
    contentHash(book({ folders: [{ ...base.folders[0], collapseState: 'tucked' }] })), h);
  check('hash ignores checkpoints',
    contentHash(book({ entries: base.entries.map((e) => ({ ...e, snapshots: [{ name: 'x' }] })) })), h);
  check('hash ignores limit-warning flags',
    contentHash(book({ entries: base.entries.map((e) => ({ ...e, ignoreLimitWarnings: { description: true, triggers: true } })) })), h);
  check('hash ignores hostSyncedAt / rollback config',
    contentHash(book({ hostSyncedAt: 'x', rollback: { enabled: true } })), h);
  check('entry order changes the hash',
    contentHash(book({ entries: [base.entries[1], base.entries[0], base.entries[2]] })) === h, false);
  check('editing a description changes the hash',
    contentHash(book({ entries: [{ ...base.entries[0], description: 'x' }, base.entries[1], base.entries[2]] })) === h, false);
  check('toggling hidden changes the hash',
    contentHash(book({ entries: [{ ...base.entries[0], hiddenFromExport: true }, base.entries[1], base.entries[2]] })) === h, false);
  check('toggling isPublic changes the hash',
    contentHash(book({ entries: [{ ...base.entries[0], isPublic: false }, base.entries[1], base.entries[2]] })) === h, false);
  check('moving an entry between folders changes the hash',
    contentHash(book({ entries: [{ ...base.entries[0], folderId: null }, base.entries[1], base.entries[2]] })) === h, false);
  check('renaming a folder changes the hash',
    contentHash(book({ folders: [{ ...base.folders[0], name: 'Elsewhere' }] })) === h, false);
  check('renaming the book changes the hash', contentHash(book({ name: 'Other' })) === h, false);
  check('allowedOverlaps change the hash', contentHash(book({ allowedOverlaps: [] })) === h, false);
  check('trigger order changes the hash',
    contentHash(book({ entries: [{ ...base.entries[0], triggers: ['fortress', 'keep'] }, base.entries[1], base.entries[2]] })) === h, false);
  check('an empty book hashes', typeof contentHash({ name: '', entries: [] }), 'string');
  check('a null book hashes without throwing', typeof contentHash(null), 'string');

  // ── validateForHost ────────────────────────────────────────────────────────
  const fields = (errs) => errs.map((e) => `${e.index}:${e.field}`).join(' ');
  check('a valid book has no errors', validateForHost(book()).length, 0);
  check('hidden entries are validated too',
    fields(validateForHost(book({ entries: [entry({ hiddenFromExport: true, triggers: [] })] }))), '0:triggers');
  check('no triggers', fields(validateForHost(book({ entries: [entry({ triggers: [] })] }))), '0:triggers');
  check('too many triggers',
    fields(validateForHost(book({ entries: [entry({ triggers: Array.from({ length: HOST_LIMITS.triggers + 1 }, (_, i) => 't' + i) })] }))), '0:triggers');
  check('exactly the trigger cap is fine',
    validateForHost(book({ entries: [entry({ triggers: Array.from({ length: HOST_LIMITS.triggers }, (_, i) => 't' + i) })] })).length, 0);
  check('a blank trigger', fields(validateForHost(book({ entries: [entry({ triggers: ['ok', '  '] })] }))), '0:triggers');
  check('empty description', fields(validateForHost(book({ entries: [entry({ description: '' })] }))), '0:description');
  check('description at the cap is fine',
    validateForHost(book({ entries: [entry({ description: 'x'.repeat(HOST_LIMITS.description) })] })).length, 0);
  check('description over the cap',
    fields(validateForHost(book({ entries: [entry({ description: 'x'.repeat(HOST_LIMITS.description + 1) })] }))), '0:description');
  check('empty entry name', fields(validateForHost(book({ entries: [entry({ name: ' ' })] }))), '0:name');
  check('entry name over the cap',
    fields(validateForHost(book({ entries: [entry({ name: 'n'.repeat(HOST_LIMITS.name + 1) })] }))), '0:name');
  check('unknown entry type', fields(validateForHost(book({ entries: [entry({ type: 'dragon' })] }))), '0:entryType');
  check('empty lorebook name is index -1', fields(validateForHost(book({ name: '' }))), '-1:name');
  check('lorebook name over the cap',
    fields(validateForHost(book({ name: 'n'.repeat(HOST_LIMITS.lorebookName + 1) }))), '-1:name');
  check('errors are reported per entry, in order',
    fields(validateForHost(book({ entries: [entry(), entry({ triggers: [] }), entry({ description: '' })] }))), '1:triggers 2:description');
  check('every error carries a message',
    validateForHost(book({ name: '', entries: [entry({ triggers: [] })] })).every((e) => typeof e.message === 'string' && e.message), true);

  // ── isHostMessage: the origin / source / envelope gate ─────────────────────
  const parent = {};
  const win = { parent };
  const ev = (over = {}) => ({ origin: HOST_ORIGINS[0], source: parent, data: { type: 'mkp:load' }, ...over });
  check('allowlisted origin + parent source + mkp: type passes', isHostMessage(ev(), null, win), true);
  check('every allowlisted origin passes',
    HOST_ORIGINS.every((o) => isHostMessage(ev({ origin: o }), null, win)), true);
  check('an unlisted origin is dropped', isHostMessage(ev({ origin: 'https://evil.example' }), null, win), false);
  check('a look-alike origin is dropped', isHostMessage(ev({ origin: 'https://charsnap.ai.evil.example' }), null, win), false);
  check('a message not from the parent frame is dropped', isHostMessage(ev({ source: {} }), null, win), false);
  check('a locked origin narrows the allowlist',
    isHostMessage(ev({ origin: HOST_ORIGINS[1] }), HOST_ORIGINS[0], win), false);
  check('…and still admits the locked one', isHostMessage(ev({ origin: HOST_ORIGINS[0] }), HOST_ORIGINS[0], win), true);
  check('a non-mkp type is ignored', isHostMessage(ev({ data: { type: 'webpackOk' } }), null, win), false);
  check('a string payload is ignored', isHostMessage(ev({ data: 'mkp:load' }), null, win), false);
  check('an array payload is ignored', isHostMessage(ev({ data: ['mkp:load'] }), null, win), false);
  check('a missing type is ignored', isHostMessage(ev({ data: { hostId: 1 } }), null, win), false);
  check('a null event is ignored', isHostMessage(null, null, win), false);

  // ── detectHostMode ─────────────────────────────────────────────────────────
  const top = { location: { search: '?host=charsnap' } };
  top.parent = top;
  check('?host=charsnap at top level is NOT host mode', detectHostMode(top), false);
  check('?host=charsnap in a frame is host mode',
    detectHostMode({ location: { search: '?host=charsnap' }, parent: {} }), true);
  check('a frame without the flag is not host mode',
    detectHostMode({ location: { search: '' }, parent: {} }), false);
  check('a different host value is not host mode',
    detectHostMode({ location: { search: '?host=other' }, parent: {} }), false);
  check('the flag survives other params',
    detectHostMode({ location: { search: '?r=1&host=charsnap' }, parent: {} }), true);
  check('no window is not host mode', detectHostMode(null), false);

  // ── evictOldestHostDraft ───────────────────────────────────────────────────
  const index = [
    { id: 'a', hostId: 'h1', updatedAt: 300 },
    { id: 'b', hostId: 'h2', updatedAt: 100 },
    { id: 'c', updatedAt: 50 },                       // standalone — never a candidate
    { id: 'd', hostId: 'h3', updatedAt: 10, ephemeral: true },
    { id: 'e', hostId: 'h4', updatedAt: 200 },
  ];
  check('picks the oldest host draft the predicate allows', evictOldestHostDraft(index, () => true), 'b');
  check('never picks a standalone book', evictOldestHostDraft(index, (id) => id === 'c'), null);
  check('never picks an ephemeral draft', evictOldestHostDraft(index, (id) => id === 'd'), null);
  check('honours the predicate (dirty drafts are kept)', evictOldestHostDraft(index, (id) => id !== 'b'), 'e');
  check('nothing evictable → null', evictOldestHostDraft(index, () => false), null);
  check('an empty index → null', evictOldestHostDraft([], () => true), null);

  const passed = results.filter(Boolean).length;
  console.log(`  ${passed}/${results.length} host serialize checks passed`);
  return results.every(Boolean);
}

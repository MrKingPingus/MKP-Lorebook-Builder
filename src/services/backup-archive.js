// The "export everything" backup (#129): what goes in the archive, and how it
// is read back. Pure — it turns state into named files and files into state;
// zipping, downloading and writing to storage happen elsewhere.
//
// Layout of the archive:
//
//   backup.json                      the manifest: what this is and what it holds
//   READ-ME.txt                      for a person who opens the zip
//   lorebooks/01-Name.json           each book in CharSnap's own JSON format —
//                                    importable on its own, here or on CharSnap
//   builder-data/01-Name.json        each book exactly as the builder holds it:
//                                    folders, checkpoints, hidden entries and all
//   builder-data/settings.json       settings
//   builder-data/templates.json      entry templates and their categories
//
// Two copies of each book because they answer different needs. The lorebooks/
// copy is the portable one, and like any export it leaves out entries hidden
// from export and everything CharSnap has no field for. Restoring from it
// would silently drop folders and checkpoints, so a restore reads
// builder-data/ and nothing else.
import { exportToJson } from './json-export.js';
import {
  BACKUP_FORMAT, BACKUP_VERSION, BACKUP_MANIFEST_FILE, BACKUP_README_FILE,
  BACKUP_PORTABLE_DIR, BACKUP_DATA_DIR, BACKUP_SETTINGS_FILE, BACKUP_TEMPLATES_FILE,
  BACKUP_README_TEXT, RESTORED_NAME_SUFFIX,
} from '../constants/backup.js';

/** A file-system-safe slug of a lorebook name, never empty. */
function safeName(name) {
  const cleaned = String(name ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || 'Untitled').slice(0, 60);
}

/**
 * @returns Array<{ name, data }> ready for buildZip.
 */
export function buildBackupFiles({ lorebooks, settings, templates, appVersion, now = Date.now() }) {
  const books = (lorebooks ?? []).filter((lb) => lb && !lb.ephemeral && Array.isArray(lb.entries));
  const width = String(books.length).length < 2 ? 2 : String(books.length).length;

  const listed = books.map((lb, i) => {
    const file = `${String(i + 1).padStart(width, '0')}-${safeName(lb.name)}.json`;
    return { lb, file };
  });

  const manifest = {
    format:     BACKUP_FORMAT,
    version:    BACKUP_VERSION,
    appVersion: appVersion ?? null,
    createdAt:  new Date(now).toISOString(),
    lorebooks:  listed.map(({ lb, file }) => ({ name: lb.name ?? '', entries: lb.entries.length, file })),
    settings:   settings != null,
    templates:  templates != null,
  };

  return [
    { name: BACKUP_MANIFEST_FILE, data: JSON.stringify(manifest, null, 2) },
    { name: BACKUP_README_FILE,   data: BACKUP_README_TEXT },
    ...listed.map(({ lb, file }) => ({ name: `${BACKUP_PORTABLE_DIR}/${file}`, data: exportToJson(lb) })),
    ...listed.map(({ lb, file }) => ({ name: `${BACKUP_DATA_DIR}/${file}`,     data: JSON.stringify(lb) })),
    ...(settings  != null ? [{ name: `${BACKUP_DATA_DIR}/${BACKUP_SETTINGS_FILE}`,  data: JSON.stringify(settings, null, 2) }]  : []),
    ...(templates != null ? [{ name: `${BACKUP_DATA_DIR}/${BACKUP_TEMPLATES_FILE}`, data: JSON.stringify(templates, null, 2) }] : []),
  ];
}

/**
 * Read the files of an archive back into state.
 * @param files Array<{ name, data: Uint8Array | string }>
 * @throws Error with a message fit to show the user
 */
export function parseBackupFiles(files) {
  const decoder = new TextDecoder();
  const text = (f) => (typeof f.data === 'string' ? f.data : decoder.decode(f.data));
  const byName = new Map((files ?? []).map((f) => [f.name, f]));
  const json = (name) => {
    const f = byName.get(name);
    if (!f) return null;
    try { return JSON.parse(text(f)); } catch { throw new Error(`"${name}" in the backup is not readable.`); }
  };

  const manifest = json(BACKUP_MANIFEST_FILE);
  if (!manifest || manifest.format !== BACKUP_FORMAT) {
    throw new Error('That zip is not a Lorebook Builder backup. To bring in a single lorebook, use Import File.');
  }
  if (typeof manifest.version !== 'number' || manifest.version > BACKUP_VERSION) {
    throw new Error('That backup was made by a newer version of the builder. Update this one, then restore it.');
  }

  const lorebooks = [];
  for (const row of manifest.lorebooks ?? []) {
    const lb = json(`${BACKUP_DATA_DIR}/${row.file}`);
    if (lb && Array.isArray(lb.entries)) lorebooks.push(lb);
  }

  return {
    appVersion: manifest.appVersion ?? null,
    createdAt:  manifest.createdAt ?? null,
    lorebooks,
    settings:   json(`${BACKUP_DATA_DIR}/${BACKUP_SETTINGS_FILE}`),
    templates:  json(`${BACKUP_DATA_DIR}/${BACKUP_TEMPLATES_FILE}`),
  };
}

/** A name not in `taken` (compared without case): Name, Name (restored), Name (restored 2)… */
export function restoredName(name, taken) {
  const base = name || 'Untitled';
  const used = new Set([...taken].map((n) => String(n).toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 1; ; n++) {
    const candidate = `${base}${RESTORED_NAME_SUFFIX.replace(')', n === 1 ? ')' : ` ${n})`)}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

/** Templates and categories from a backup that this library does not already have, by id. */
export function mergeTemplates(current, incoming) {
  const merge = (have, add) => {
    const ids = new Set((have ?? []).map((x) => x.id));
    return [...(have ?? []), ...(add ?? []).filter((x) => x && !ids.has(x.id))];
  };
  return {
    templates:  merge(current?.templates,  incoming?.templates),
    categories: merge(current?.categories, incoming?.categories),
  };
}

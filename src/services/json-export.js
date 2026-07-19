// Serialize the active lorebook state to a prettified JSON Blob in the CharSnap
// format — keyed-object entries, `entryType` labels, `isPublic` — ready for download.
import { ENTRY_TYPES } from '../constants/entry-types.js';

// Internal type ids (e.g. 'plot_event') map to the CharSnap entry-type labels
// (e.g. 'PlotEvent') that the platform reads back on import.
const TYPE_LABEL = Object.fromEntries(ENTRY_TYPES.map((t) => [t.id, t.label]));

export function exportToJsonBlob(lorebook) {
  // hiddenFromExport entries are omitted entirely. The rest are renumbered
  // 1..N as string keys to match the CharSnap keyed-object shape. App-internal
  // fields (id, lastModified, snapshots, ignoreLimitWarnings, hiddenFromExport)
  // are dropped; only the CharSnap fields are emitted.
  const entries = {};
  lorebook.entries
    .filter((e) => !e.hiddenFromExport)
    .forEach((e, i) => {
      entries[String(i + 1)] = {
        name:        e.name ?? '',
        triggers:    [...(e.triggers ?? [])],
        description: e.description ?? '',
        entryType:   TYPE_LABEL[e.type] ?? e.type,
        isPublic:    e.isPublic !== false,
      };
    });

  const exported = { name: lorebook.name, entries };
  const json = JSON.stringify(exported, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

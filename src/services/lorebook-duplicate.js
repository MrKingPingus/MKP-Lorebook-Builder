// Duplicate a whole lorebook (#137). Pure: takes a book, returns a new one.
//
// What a copy must NOT carry:
//   - its id, and every entry and folder id (a copy shares nothing with the
//     original, so editing either can never reach the other);
//   - any `host*` field (hostId, hostSyncedAt, hostPending). A copy that kept
//     the original's hostId would, inside CharSnap, save over the original;
//   - `placeholder` / `ephemeral`, which describe how the original was made.
//
// What it does carry: entries with their checkpoints, folders with their
// nesting (parent ids remapped), allowed overlaps and checkpoint settings.
// Entries keep their lastModified, since nothing about them changed.
import { cloneEntry, uid } from './entry-factory.js';

export function duplicateLorebook(source, { name } = {}) {
  if (!source) return null;

  const folderIds = new Map((source.folders ?? []).map((f) => [f.id, uid()]));
  const folders = (source.folders ?? []).map((f) => ({
    ...f,
    id:       folderIds.get(f.id),
    parentId: f.parentId != null ? (folderIds.get(f.parentId) ?? null) : null,
  }));

  const entries = (source.entries ?? []).map((e) => ({
    ...cloneEntry(e, { keepSnapshots: true, keepModified: true }),
    folderId: e.folderId != null ? (folderIds.get(e.folderId) ?? null) : null,
  }));

  const copy = Object.fromEntries(
    Object.entries(source).filter(([k]) => !k.startsWith('host') && k !== 'placeholder' && k !== 'ephemeral'),
  );

  return {
    ...copy,
    id:              uid(),
    name:            name ?? source.name,
    entries,
    folders,
    allowedOverlaps: [...(source.allowedOverlaps ?? [])],
    ...(source.rollback ? { rollback: { ...source.rollback } } : {}),
  };
}

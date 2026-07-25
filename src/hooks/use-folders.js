// Folder CRUD, entry assignment, and collapse state for the active lorebook.
// Structural changes (create / delete / rename / recolour / move entries) push
// a history snapshot that carries BOTH entries and folders, so an undo puts the
// whole organization layer back. Collapse toggles are view state and never
// touch history.
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import {
  createFolder as makeFolder,
  assignEntriesToFolder,
  removeFolder,
  updateFolder,
  nextCollapseState,
  countEntriesInFolder,
  getFolder,
  foldersOf,
} from '../services/folder-tree.js';

export function useFolders() {
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const updateActiveFolders            = useLorebookStore((s) => s.updateActiveFolders);
  const updateActiveEntriesAndFolders  = useLorebookStore((s) => s.updateActiveEntriesAndFolders);
  const pushSnapshot     = useHistoryStore((s) => s.pushSnapshot);

  const activeLorebook = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  const entries = activeLorebook?.entries ?? [];
  const folders = foldersOf(activeLorebook);

  function snapshot() {
    pushSnapshot({ entries: [...entries], folders: [...folders] });
  }

  // Create an empty folder. Returns the new folder so callers can chain (e.g.
  // "move selection into a brand-new folder").
  function createFolder(overrides = {}) {
    snapshot();
    const folder = makeFolder(folders, overrides);
    updateActiveFolders([...folders, folder]);
    return folder;
  }

  // One snapshot, one write: new folder + the entries filed into it.
  function createFolderWithEntries(ids, overrides = {}) {
    snapshot();
    const folder = makeFolder(folders, overrides);
    const nextFolders = [...folders, folder];
    const nextEntries = assignEntriesToFolder(entries, ids, folder.id);
    updateActiveEntriesAndFolders(nextEntries, nextFolders);
    return folder;
  }

  function renameFolder(id, name) {
    const folder = getFolder(folders, id);
    if (!folder || folder.name === name) return;
    snapshot();
    updateActiveFolders(updateFolder(folders, id, { name }));
  }

  function setFolderColor(id, color) {
    const folder = getFolder(folders, id);
    if (!folder || folder.color === color) return;
    snapshot();
    updateActiveFolders(updateFolder(folders, id, { color }));
  }

  // Deleting a folder never deletes entries — they surface as top-level.
  function deleteFolder(id) {
    if (!getFolder(folders, id)) return;
    snapshot();
    const next = removeFolder(entries, folders, id);
    updateActiveEntriesAndFolders(next.entries, next.folders);
  }

  // Collapse is view state: no snapshot, no lastModified churn.
  function cycleCollapse(id) {
    const folder = getFolder(folders, id);
    if (!folder) return;
    updateActiveFolders(updateFolder(folders, id, {
      collapseState: nextCollapseState(folder.collapseState),
    }));
  }

  function setCollapseState(id, collapseState) {
    const folder = getFolder(folders, id);
    if (!folder || folder.collapseState === collapseState) return;
    updateActiveFolders(updateFolder(folders, id, { collapseState }));
  }

  // Move entries into a folder (or out of one, with folderId === null). Also
  // repositions them in entries[] so a folder's members stay contiguous.
  function moveEntriesToFolder(ids, folderId) {
    const idSet = new Set(ids);
    if (idSet.size === 0) return;
    const target = folderId ?? null;
    const hasWork = entries.some((e) => idSet.has(e.id) && (e.folderId ?? null) !== target);
    if (!hasWork) return;
    snapshot();
    updateActiveEntriesAndFolders(assignEntriesToFolder(entries, ids, target), folders);
  }

  function moveEntryToFolder(id, folderId) {
    moveEntriesToFolder([id], folderId);
  }

  function entryCount(folderId) {
    return countEntriesInFolder(entries, folderId);
  }

  return {
    folders,
    hasFolders: folders.length > 0,
    createFolder,
    createFolderWithEntries,
    renameFolder,
    setFolderColor,
    deleteFolder,
    cycleCollapse,
    setCollapseState,
    moveEntriesToFolder,
    moveEntryToFolder,
    entryCount,
  };
}

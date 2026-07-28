// Folder CRUD, entry assignment, and collapse state for the active lorebook.
// Structural changes (create / delete / rename / recolour / move entries) push
// a history snapshot that carries BOTH entries and folders, so an undo puts the
// whole organization layer back. Collapse toggles are view state and never
// touch history.
import { createEmptyEntry } from '../services/entry-factory.js';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore }  from '../state/history-store.js';
import { useUiStore }       from '../state/ui-store.js';
import { suppressesFolders } from '../constants/sort-modes.js';
import { MAX_FOLDER_DEPTH } from '../constants/folders.js';
import {
  createFolder as makeFolder,
  clampCollapseState,
  subtreeHeight,
  assignEntriesToFolder,
  removeFolder,
  updateFolder,
  nextCollapseState,
  countEntriesInFolder,
  getFolder,
  foldersOf,
  setFolderParent,
  eligibleParents,
  depthOf,
} from '../services/folder-tree.js';
import { COLLAPSE_STATES, normalizeCollapseStages } from '../constants/folders.js';
import { useSettingsStore } from '../state/settings-store.js';

export function useFolders() {
  const lorebooks        = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const updateActiveFolders            = useLorebookStore((s) => s.updateActiveFolders);
  const updateActiveEntriesAndFolders  = useLorebookStore((s) => s.updateActiveEntriesAndFolders);
  const pushSnapshot     = useHistoryStore((s) => s.pushSnapshot);
  const sortMode         = useUiStore((s) => s.sortMode);
  const setPendingFocusFolderId = useUiStore((s) => s.setPendingFocusFolderId);
  const setPendingFocusEntryId  = useUiStore((s) => s.setPendingFocusEntryId);
  const collapseStages = useSettingsStore((s) => s.folderCollapseStages);
  // Tolerant read: handles the legacy 'three'/'two' strings from before this
  // was a checkbox set, so nobody's stored setting needs migrating on disk.
  const cycle = normalizeCollapseStages(collapseStages);

  const activeLorebook = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  const entries = activeLorebook?.entries ?? [];
  const folders = foldersOf(activeLorebook);

  function snapshot() {
    pushSnapshot({ entries: [...entries], folders: [...folders] });
  }

  // Create an empty folder. Returns the new folder so callers can chain (e.g.
  // "move selection into a brand-new folder"). Every folder is born as
  // "New Folder", so creation always hands the header its rename input.
  function createFolder(overrides = {}) {
    snapshot();
    const folder = makeFolder(folders, overrides);
    updateActiveFolders([...folders, folder]);
    setPendingFocusFolderId(folder.id);
    return folder;
  }

  // One snapshot, one write: new folder + the entries filed into it.
  function createFolderWithEntries(ids, overrides = {}) {
    snapshot();
    const folder = makeFolder(folders, overrides);
    const nextFolders = [...folders, folder];
    const nextEntries = assignEntriesToFolder(entries, ids, folder.id);
    updateActiveEntriesAndFolders(nextEntries, nextFolders);
    setPendingFocusFolderId(folder.id);
    return folder;
  }

  // New entry, born inside a folder. Goes through assignEntriesToFolder so it
  // lands at the end of that folder's run exactly like a filed entry would —
  // appending to entries[] and then filing would leave it stranded outside the
  // run until the next reshuffle.
  function addEntryInFolder(folderId) {
    if (!getFolder(folders, folderId)) return null;
    snapshot();
    const entry = createEmptyEntry();
    const next  = assignEntriesToFolder([...entries, entry], [entry.id], folderId);
    updateActiveEntriesAndFolders(next, folders);
    setPendingFocusEntryId(entry.id);
    return entry;
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
    // Advance from what's actually rendering, so a folder left condensed after
    // a switch to two stages moves on rather than sticking.
    updateActiveFolders(updateFolder(folders, id, {
      collapseState: nextCollapseState(clampCollapseState(folder.collapseState, cycle), cycle),
    }));
  }

  function setCollapseState(id, collapseState) {
    const folder = getFolder(folders, id);
    if (!folder || folder.collapseState === collapseState) return;
    updateActiveFolders(updateFolder(folders, id, { collapseState }));
  }

  // Nest a folder under another (null = top level). Also re-gathers entries[]
  // on both sides of the move so array order keeps matching the screen. No-op
  // when the move would make a cycle or breach the depth cap.
  function nestFolder(folderId, parentId) {
    const folder = getFolder(folders, folderId);
    if (!folder || (folder.parentId ?? null) === (parentId ?? null)) return;
    const next = setFolderParent(entries, folders, folderId, parentId ?? null);
    if (!next) return;
    snapshot();
    updateActiveEntriesAndFolders(next.entries, next.folders);
  }

  // Create a folder and drop this one inside it — "＋ New folder" from a
  // folder's nest menu. Only legal while the subtree would still fit under the
  // depth cap once a new level sits above it.
  function createFolderAsParentOf(folderId) {
    const folder = getFolder(folders, folderId);
    if (!folder || !canCreateParentFor(folderId)) return;
    snapshot();
    const parent = makeFolder(folders, {});
    const withParent = [...folders, parent];
    const next = setFolderParent(entries, withParent, folderId, parent.id);
    if (!next) return;
    updateActiveEntriesAndFolders(next.entries, next.folders);
    setPendingFocusFolderId(parent.id);
    return parent;
  }

  function canCreateParentFor(folderId) {
    return subtreeHeight(folders, folderId) + 1 <= MAX_FOLDER_DEPTH;
  }

  // Global folder collapse. View state, so no snapshot — same rule as the
  // per-folder cycle. Two-state: anything not tucked means "tuck everything",
  // otherwise open everything back up.
  function toggleAllFolders() {
    if (folders.length === 0) return;
    const anyOpen = folders.some((f) => f.collapseState !== COLLAPSE_STATES.TUCKED);
    const next = anyOpen ? COLLAPSE_STATES.TUCKED : COLLAPSE_STATES.FULL;
    updateActiveFolders(folders.map((f) => ({ ...f, collapseState: next })));
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
    // True when the active sort is hiding the folder layer — surfaces in the UI
    // so creating a folder can't silently produce something invisible.
    foldersSuppressed: suppressesFolders(sortMode),
    // True when every folder is tucked — drives the global toggle's label.
    allFoldersTucked: folders.length > 0
      && folders.every((f) => f.collapseState === COLLAPSE_STATES.TUCKED),
    parentOptions: (folderId) => eligibleParents(folders, folderId),
    canCreateParentFor,
    createFolderAsParentOf,
    // The active collapse cycle, so the header can render only offered states.
    collapseCycle: cycle,
    renderedCollapseState: (state) => clampCollapseState(state, cycle),
    folderDepth:   (folderId) => depthOf(folders, folderId),
    nestFolder,
    toggleAllFolders,
    createFolder,
    createFolderWithEntries,
    addEntryInFolder,
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

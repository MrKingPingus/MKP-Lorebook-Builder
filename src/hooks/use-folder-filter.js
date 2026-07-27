// Folder filter state for the active lorebook: which folders are selected, the
// menu options, and the predicate that narrows a list to them.
//
// Folder ids belong to one book. Type ids are shared vocabulary across every
// lorebook, so the type filter can safely apply to both crosstalk panes; folder
// ids can't, and a filter carrying the wrong book's ids would empty a pane
// rather than narrow it. So this is active-book only (see `useDisplayEntries`),
// and the selection is pruned against the active book's folders on every read —
// which is also what makes deleting a filtered folder, or swapping crosstalk
// roles, degrade to "no filter" instead of "no results".
import { useLorebookStore } from '../state/lorebook-store.js';
import { useUiStore }       from '../state/ui-store.js';
import {
  foldersOf,
  pruneFolderFilter,
  filterEntriesByFolders,
  folderFilterOptions,
} from '../services/folder-tree.js';

export function useFolderFilter() {
  const lorebooks          = useLorebookStore((s) => s.lorebooks);
  const activeLorebookId   = useLorebookStore((s) => s.activeLorebookId);
  const rawFilter          = useUiStore((s) => s.folderFilter);
  const setFolderFilter    = useUiStore((s) => s.setFolderFilter);
  const toggleFolderFilter = useUiStore((s) => s.toggleFolderFilter);

  const activeLorebook = activeLorebookId ? lorebooks[activeLorebookId] ?? null : null;
  const entries = activeLorebook?.entries ?? [];
  const folders = foldersOf(activeLorebook);

  const folderFilter = pruneFolderFilter(folders, rawFilter);
  const filterActive = folderFilter.length > 0;

  return {
    folderFilter,
    filterActive,
    hasFolders:    folders.length > 0,
    folderOptions: folderFilterOptions(entries, folders),
    toggleFolderFilter,
    clearFolderFilter: () => setFolderFilter([]),
    // Narrow any list by the current selection. Callers on the reference side
    // must not use this — see the note above.
    filterEntries: (list) => filterEntriesByFolders(list, folders, folderFilter),
  };
}

// Sort modes that impose their own ordering on the list, and therefore can't
// coexist with a grouping layer on top of them.
//
// `last-modified` orders by recency and `cross-match-first` / `-last` partition
// the list by which entries share a name with the paired reference book. Any
// grouping — type headers, folders — re-buckets the list and destroys exactly
// the ordering the user asked for, so grouping is suppressed while these are
// active.
export const SORT_MODES_WITHOUT_GROUPING = ['last-modified', 'cross-match-first', 'cross-match-last'];

// Folders survive a recency sort (a folder's members simply appear wherever
// their newest member landed), but not the cross-match partition — regrouping
// filed entries pulls matched and unmatched entries back together and the
// partition stops meaning anything.
export const SORT_MODES_WITHOUT_FOLDERS = ['cross-match-first', 'cross-match-last'];

export function suppressesFolders(sortMode) {
  return SORT_MODES_WITHOUT_FOLDERS.includes(sortMode);
}

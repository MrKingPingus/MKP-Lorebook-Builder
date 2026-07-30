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

// How folder rows order themselves against their sibling entries.
//
// By default a folder anchors at the earliest position anywhere in its subtree,
// which reads correctly for manual order and for `last-modified` (a folder lands
// where its most recently touched member landed). It reads *wrong* under an
// alpha sort: a folder named "Zeta" holding an entry named "Apple" would anchor
// above a loose entry named "Beta", so the column doesn't run A→Z even though
// that is exactly what was asked for. Under those modes folder rows sort by
// their own name instead, interleaved with entries in one alphabetical stream.
export const FOLDER_ORDER_BY_SORT = {
  'alpha-asc':  'name-asc',
  'alpha-desc': 'name-desc',
};

export const DEFAULT_FOLDER_ORDER = 'position';

export function folderOrderFor(sortMode) {
  return FOLDER_ORDER_BY_SORT[sortMode] ?? DEFAULT_FOLDER_ORDER;
}

// How the lorebook list is ordered in the title menu and the pull-tab panel.
// Recency is the default: you are more likely to want the book you were just in
// than the one starting with "A". Alphabetical is there for people who keep many
// books and navigate them by name.
export const LOREBOOK_SORT = {
  recent: 'recent',
  alpha:  'alpha',
};
export const LOREBOOK_SORT_OPTIONS = [
  { id: LOREBOOK_SORT.recent, label: 'Recent',       title: 'Most recently opened first' },
  { id: LOREBOOK_SORT.alpha,  label: 'A–Z',          title: 'Alphabetical by name' },
];

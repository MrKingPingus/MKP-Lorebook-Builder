// The one import flow, shared by every surface that imports (the title
// dropdown, the Import/Export side panel, and the hotbar's Import overlay).
//
// Before this existed each surface had its own subset: the side panel offered a
// backup step but no paste, the hotbar offered paste but no backup, and neither
// laid the choices out the same way. Anything added to one had to be remembered
// in the others, and a fix in one place stayed broken in the other two.

/** Where the flow is. Surfaces render differently per stage but never skip one. */
export const IMPORT_STAGE = {
  source:      'source',       // pick a file, or paste text
  disposition: 'disposition',  // parsed — decide what happens to the current book
  preview:     'preview',      // confirm what's about to land
};

/** How the entries arrived. */
export const IMPORT_SOURCE = {
  file:  'file',
  paste: 'paste',
};

/** What confirming does. */
export const IMPORT_DISPOSITION = {
  asNew:   'as-new',   // new lorebook; the current one is untouched
  append:  'append',   // add to the current book
  replace: 'replace',  // overwrite the current book's entries
};

export const IMPORT_ACCEPT = '.txt,.docx,.odt,.json';

/** Label used in place of a filename when the entries came from the textarea. */
export const PASTED_SOURCE_LABEL = 'Pasted text';

// The four buttons on the disposition screen, laid out 2×2. Three set a
// disposition directly; `backupFirst` downloads a copy of the current book and
// then proceeds as a replace, which is the only reason it isn't a disposition
// of its own.
//
// 2×2 rather than four across: four buttons in a row does not fit the dropdown's
// column at 480px, and a wrap that isn't a deliberate grid looks like a bug.
export const IMPORT_DISPOSITION_OPTIONS = [
  {
    id:          IMPORT_DISPOSITION.asNew,
    title:       'Import as new',
    hint:        'Current book untouched',
    backupFirst: false,
    danger:      false,
  },
  {
    id:          IMPORT_DISPOSITION.append,
    title:       'Append',
    hint:        'Add to the current book',
    backupFirst: false,
    danger:      false,
  },
  {
    id:          IMPORT_DISPOSITION.replace,
    title:       'Replace',
    hint:        'Overwrites what is there now',
    backupFirst: false,
    danger:      true,
  },
  {
    id:          IMPORT_DISPOSITION.replace,
    title:       'Back up first',
    hint:        'Download a copy, then replace',
    backupFirst: true,
    danger:      false,
  },
];

// Autosave means the work is already saved; a backup is about getting a copy out
// of the browser, which is a different thing and worth saying so nobody skips it
// thinking they're covered.
export const IMPORT_BACKUP_NOTE =
  'Autosave already saved your work — a backup keeps a copy outside the browser.';

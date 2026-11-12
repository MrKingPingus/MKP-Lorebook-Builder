// The "export everything" backup archive (#129). See services/backup-archive.js
// for what each file is for.
export const BACKUP_FORMAT  = 'mkp-lorebook-builder-backup';
export const BACKUP_VERSION = 1;

export const BACKUP_MANIFEST_FILE  = 'backup.json';
export const BACKUP_README_FILE    = 'READ-ME.txt';
export const BACKUP_PORTABLE_DIR   = 'lorebooks';
export const BACKUP_DATA_DIR       = 'builder-data';
export const BACKUP_SETTINGS_FILE  = 'settings.json';
export const BACKUP_TEMPLATES_FILE = 'templates.json';

export const BACKUP_FILENAME_PREFIX = 'lorebook-builder-backup';

// Appended when a restored lorebook's name is already taken.
export const RESTORED_NAME_SUFFIX = ' (restored)';

export const RESTORE_ADD     = 'add';      // put the backup's lorebooks alongside what is here
export const RESTORE_REPLACE = 'replace';  // remove what is here first

export const BACKUP_README_TEXT = `MKP Lorebook Builder backup

To restore everything: open the Lorebook Builder, go to its landing page, choose
"Restore Backup" and pick this zip file. Do not unpack it first.

To use a single lorebook: the files in the "lorebooks" folder are ordinary
lorebook JSON files. Import one into the Lorebook Builder with Import File, or
into CharSnap.

The "builder-data" folder is what a full restore reads. It holds each lorebook
with its folders, checkpoints and hidden entries, plus your settings and entry
templates. It is not meant to be edited by hand.
`;

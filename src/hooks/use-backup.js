// Export everything / restore from backup (#129).
//
// Exporting reads every stored lorebook, the settings and the templates, and
// downloads them as one zip. Restoring reads such a zip back and either adds
// its lorebooks alongside what is here, or replaces what is here after
// downloading a backup of it first. Either way every restored lorebook gets
// new ids (via duplicateLorebook), so restoring a backup into the browser it
// came from can never collide with, or overwrite, the books already there.
import { useLorebookStore }  from '../state/lorebook-store.js';
import { useSettingsStore }  from '../state/settings-store.js';
import { useTemplatesStore } from '../state/templates-store.js';
import { useLorebook }       from './use-lorebook.js';
import { readJson, writeJson, saveLorebook, saveLorebookIndex } from '../services/storage-service.js';
import { buildZip }          from '../services/zip-builder.js';
import { readZip }           from '../services/zip-reader.js';
import { downloadBlob }      from '../services/json-export.js';
import { addToIndex }        from '../services/lorebook-index.js';
import { duplicateLorebook } from '../services/lorebook-duplicate.js';
import { isPlaceholderLorebook } from '../services/entry-factory.js';
import { buildBackupFiles, parseBackupFiles, restoredName, mergeTemplates } from '../services/backup-archive.js';
import { LOREBOOK_KEY_PREFIX, SETTINGS_KEY, TEMPLATES_KEY } from '../constants/storage-keys.js';
import { BACKUP_FILENAME_PREFIX, RESTORE_REPLACE } from '../constants/backup.js';
import { MAX_TEMPLATES } from '../constants/templates.js';
import { APP_VERSION }   from '../constants/version.js';

/** Every stored lorebook, freshest copy first: the store's, else storage's. */
function allLorebooks() {
  const { lorebookIndex, lorebooks } = useLorebookStore.getState();
  return lorebookIndex
    .filter((item) => !item.ephemeral)
    .map((item) => lorebooks[item.id] ?? readJson(LOREBOOK_KEY_PREFIX + item.id))
    .filter(Boolean);
}

export function useBackup() {
  const { deleteLorebook, switchLorebook } = useLorebook();
  const lorebookCount = useLorebookStore((s) => s.lorebookIndex.filter((i) => !i.ephemeral).length);

  function exportEverything() {
    const files = buildBackupFiles({
      lorebooks:  allLorebooks(),
      settings:   readJson(SETTINGS_KEY),
      templates:  readJson(TEMPLATES_KEY),
      appVersion: APP_VERSION,
    });
    const blob = new Blob([buildZip(files)], { type: 'application/zip' });
    downloadBlob(blob, `${BACKUP_FILENAME_PREFIX}-${new Date().toISOString().slice(0, 10)}.zip`);
  }

  /** Read a chosen file. Resolves to the parsed backup; rejects with a message to show. */
  async function readBackupFile(file) {
    return parseBackupFiles(await readZip(await file.arrayBuffer()));
  }

  /**
   * @param backup        from readBackupFile
   * @param mode          RESTORE_ADD | RESTORE_REPLACE
   * @param withSettings  also replace this builder's settings with the backup's
   * @returns { restored, skipped } — skipped counts lorebooks that did not fit
   */
  function restoreBackup(backup, { mode, withSettings = false }) {
    const replacing = mode === RESTORE_REPLACE;

    if (replacing) {
      // The safety copy comes first, and of the state as it stands.
      exportEverything();
      for (const lb of allLorebooks()) deleteLorebook(lb.id);
    }

    // A placeholder is the empty book a fresh builder starts with. It is not
    // something the user made, so it should not survive a restore beside the
    // real books, nor have its name counted as taken.
    const before      = useLorebookStore.getState();
    const placeholder = Object.values(before.lorebooks).find(isPlaceholderLorebook) ?? null;
    const taken = before.lorebookIndex
      .filter((i) => i.id !== placeholder?.id)
      .map((i) => i.name ?? '');

    let restored = 0;
    let skipped  = 0;
    let firstId  = null;
    for (const source of backup.lorebooks) {
      const name = restoredName(source.name, taken);
      const copy = duplicateLorebook(source, { name });
      const next = addToIndex(useLorebookStore.getState().lorebookIndex, copy);
      if (!next) { skipped++; continue; } // the library is full
      useLorebookStore.getState().setLorebook(copy);
      useLorebookStore.getState().setLorebookIndex(next);
      saveLorebook(copy);
      taken.push(name);
      firstId ??= copy.id;
      restored++;
    }
    saveLorebookIndex(useLorebookStore.getState().lorebookIndex);

    if (firstId) {
      const active = useLorebookStore.getState().activeLorebookId;
      if (!active || active === placeholder?.id) switchLorebook(firstId);
      if (placeholder) deleteLorebook(placeholder.id);
    }

    if (backup.templates) {
      const current = useTemplatesStore.getState();
      const merged  = replacing ? backup.templates : mergeTemplates(current, backup.templates);
      const next = {
        templates:  (merged.templates ?? []).slice(0, MAX_TEMPLATES),
        categories: merged.categories ?? [],
      };
      useTemplatesStore.getState().setAll(next);
      writeJson(TEMPLATES_KEY, next);
    }

    if (withSettings && backup.settings) {
      useSettingsStore.getState().applySettings(backup.settings);
      writeJson(SETTINGS_KEY, backup.settings);
    }

    return { restored, skipped };
  }

  return { lorebookCount, exportEverything, readBackupFile, restoreBackup };
}

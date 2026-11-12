// The landing page's Restore Backup tile, and the dialog it opens (#129).
//
// Picking a zip only reads it. Nothing is written until the dialog's Restore
// is pressed, after it has said what the backup holds and asked how to bring
// it in. "Add alongside" leads because it cannot lose anything.
import { useState, useRef } from 'react';
import { createPortal }    from 'react-dom';
import { useBackup }       from '../../hooks/use-backup.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import { RESTORE_ADD, RESTORE_REPLACE } from '../../constants/backup.js';
import { MAX_LOREBOOKS } from '../../constants/limits.js';

export function RestoreBackupTile() {
  const { lorebookCount, readBackupFile, restoreBackup } = useBackup();
  const inputRef = useRef(null);
  const [backup, setBackup] = useState(null);
  const [error, setError]   = useState('');
  const [mode, setMode]     = useState(RESTORE_ADD);
  const [withSettings, setWithSettings] = useState(false);
  const [outcome, setOutcome] = useState(null);

  function closeDialog() { setBackup(null); setOutcome(null); }
  useDismissLayer('restore-backup', backup !== null, DISMISS_PRIORITY.modal, closeDialog);

  async function onChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still fires
    if (!file) return;
    setError('');
    try {
      const parsed = await readBackupFile(file);
      setMode(RESTORE_ADD);
      // On a builder with nothing in it yet there are no settings worth
      // keeping, so taking the backup's is what a migration wants.
      setWithSettings(lorebookCount === 0 && !!parsed.settings);
      setOutcome(null);
      setBackup(parsed);
    } catch (err) {
      setError(err?.message || 'That file could not be read.');
    }
  }

  function onRestore() {
    setOutcome(restoreBackup(backup, { mode, withSettings }));
  }

  const count    = backup?.lorebooks.length ?? 0;
  const made     = backup?.createdAt ? new Date(backup.createdAt).toLocaleDateString() : null;
  const room     = MAX_LOREBOOKS - (mode === RESTORE_REPLACE ? 0 : lorebookCount);
  const overflow = Math.max(0, count - room);

  return (
    <>
      <button className="lander-tile" onClick={() => inputRef.current?.click()} type="button">
        <div className="lander-tile-icon">⟲</div>
        <div className="lander-tile-title">Restore Backup</div>
        <div className="lander-tile-sub">An “Export everything” zip</div>
      </button>
      <input ref={inputRef} type="file" accept=".zip,application/zip" style={{ display: 'none' }} onChange={onChosen} />
      {error && <div className="lander-import-error lander-restore-error">{error}</div>}

      {backup && createPortal(
        <div className="tpl-manager-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}>
          <div className="restore-dialog" role="dialog" aria-modal="true" aria-label="Restore backup">
            <h2 className="tpl-manager-title">Restore backup</h2>

            {outcome ? (
              <>
                <p className="restore-line restore-outcome">
                  Restored {outcome.restored} {outcome.restored === 1 ? 'lorebook' : 'lorebooks'}.
                  {outcome.skipped > 0 && ` ${outcome.skipped} did not fit: the library holds ${MAX_LOREBOOKS}.`}
                </p>
                <div className="tpl-detail-actions">
                  <button type="button" className="tpl-btn tpl-btn--primary restore-done" onClick={closeDialog}>Done</button>
                </div>
              </>
            ) : (
              <>
                <p className="restore-line">
                  This backup holds <strong>{count} {count === 1 ? 'lorebook' : 'lorebooks'}</strong>
                  {backup.templates ? ', your entry templates' : ''}{backup.settings ? ' and your settings' : ''}
                  {made ? `, saved on ${made}` : ''}{backup.appVersion ? ` from v${backup.appVersion}` : ''}.
                </p>

                <fieldset className="tpl-fields">
                  <label className="tpl-field-check">
                    <input type="radio" name="restore-mode" checked={mode === RESTORE_ADD} onChange={() => setMode(RESTORE_ADD)} />
                    <span>Add them alongside what’s here</span>
                  </label>
                  <p className="restore-hint">Nothing here is changed. A lorebook whose name is taken arrives as “Name (restored)”.</p>
                  <label className="tpl-field-check">
                    <input type="radio" name="restore-mode" checked={mode === RESTORE_REPLACE} onChange={() => setMode(RESTORE_REPLACE)} disabled={count === 0} />
                    <span>Replace everything here</span>
                  </label>
                  <p className="restore-hint">
                    Removes the {lorebookCount} {lorebookCount === 1 ? 'lorebook' : 'lorebooks'} here now and their templates.
                    A backup of them is downloaded first.
                  </p>
                </fieldset>

                {backup.settings && (
                  <label className="tpl-field-check">
                    <input type="checkbox" checked={withSettings} onChange={(e) => setWithSettings(e.target.checked)} />
                    <span>Also use the backup’s settings in place of mine</span>
                  </label>
                )}

                {overflow > 0 && (
                  <p className="restore-hint restore-warn">
                    Only {Math.max(0, room)} will fit: the library holds {MAX_LOREBOOKS} lorebooks. {overflow} will be left out.
                  </p>
                )}

                <div className="tpl-detail-actions">
                  <button type="button" className="tpl-btn tpl-btn--primary restore-go" onClick={onRestore}>Restore</button>
                  <button type="button" className="tpl-btn" onClick={closeDialog}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

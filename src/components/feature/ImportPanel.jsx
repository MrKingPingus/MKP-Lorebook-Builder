// Import tab content — drag-drop zone, auto-detect format, save-warning prompt, and ImportPreview
import { useState } from 'react';
import { DropZone }      from '../ui/DropZone.jsx';
import { ImportPreview } from './ImportPreview.jsx';
import { useEntries }       from '../../hooks/use-entries.js';
import { useLorebook }      from '../../hooks/use-lorebook.js';
import { useImport }        from '../../hooks/use-import.js';
import { useExport }        from '../../hooks/use-export.js';
import { useUi }            from '../../hooks/use-ui.js';
import { useMobile }        from '../../hooks/use-mobile.js';
import { useSettings }      from '../../hooks/use-settings.js';

export function ImportPanel() {
  const [preview, setPreview]           = useState(null);
  const [importedName, setImportedName] = useState(null);
  const [warnings, setWarnings]         = useState([]);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [savePending, setSavePending]   = useState(false);
  // disposition determines what Confirm does once the preview is shown:
  //   'replace' — replace active book's entries (default; matches old behavior)
  //   'append'  — append the imported entries to the active book
  //   'as-new'  — create a new lorebook slot and load the import there
  const [disposition, setDisposition]   = useState('replace');

  const { entries, replaceEntries }     = useEntries();
  const { activeLorebook, renameLorebook, importAsNewLorebook } = useLorebook();
  const { parseFile }                  = useImport();
  const { exportJson: doExportJson, exportTxt: doExportTxt } = useExport();
  const setActiveMenuPanel = useUi((s) => s.setActiveMenuPanel);
  const isMobile                       = useMobile();
  const { keepMenuOpenAfterImport }    = useSettings();

  function resetAll() {
    setPreview(null);
    setImportedName(null);
    setWarnings([]);
    setError('');
    setSavePending(false);
    setDisposition('replace');
  }

  async function handleFile(file) {
    setError('');
    setPreview(null);
    setImportedName(null);
    setWarnings([]);
    setSavePending(false);
    setDisposition('replace');
    setLoading(true);
    try {
      const result = await parseFile(file);
      setPreview(result.entries);
      if (result.name != null) setImportedName(result.name);
      setWarnings(result.warnings ?? []);
      setSavePending(true);
    } catch (e) {
      setError(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  // Save current lorebook as JSON then proceed to preview (replace path)
  function saveAsJson() {
    if (activeLorebook) {
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      doExportJson(activeLorebook, `${safe}.json`);
    }
    setDisposition('replace');
    setSavePending(false);
  }

  // Save current lorebook as TXT then proceed to preview (replace path)
  function saveAsTxt() {
    if (activeLorebook) {
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      doExportTxt(activeLorebook, `${safe}.txt`);
    }
    setDisposition('replace');
    setSavePending(false);
  }

  // Choose Replace without saving a backup
  function chooseReplace() {
    setDisposition('replace');
    setSavePending(false);
  }

  // Choose Append — keeps the active book intact and adds the imported entries
  function chooseAppend() {
    setDisposition('append');
    setSavePending(false);
  }

  // Choose As-New — create a new lorebook slot, current book stays untouched
  function chooseAsNew() {
    setDisposition('as-new');
    setSavePending(false);
  }

  // Mobile always closes the full-screen menu; desktop honors the user preference.
  function closeMenuIfNeeded() {
    if (isMobile || !keepMenuOpenAfterImport) setActiveMenuPanel(null);
  }

  function confirm() {
    if (!preview) return;
    if (disposition === 'append') {
      replaceEntries([...entries, ...preview]);
    } else if (disposition === 'as-new') {
      importAsNewLorebook({ entries: preview, name: importedName });
    } else {
      // 'replace'
      replaceEntries(preview);
      if (importedName != null) renameLorebook(importedName);
    }
    resetAll();
    closeMenuIfNeeded();
  }

  const lorebookName = activeLorebook?.name || '(unnamed)';

  return (
    <div className="import-panel">
      {/* Save / disposition prompt — shown immediately after a file is parsed.
          The Save buttons back up the active book before a replace; the lower
          row offers non-replacing alternatives (Append / Import as New) that
          skip the backup nudge. */}
      {savePending && preview?.length > 0 && (
        <div className="import-save-prompt">
          <div className="import-save-warning">
            Importing {preview.length} {preview.length === 1 ? 'entry' : 'entries'} from file
          </div>
          <div className="import-save-label">Save a backup of &ldquo;{lorebookName}&rdquo; first? (recommended before replacing)</div>
          <div className="import-save-actions">
            <button className="import-save-btn" onClick={saveAsJson}>⬇ JSON</button>
            <button className="import-save-btn" onClick={saveAsTxt}>⬇ TXT</button>
            <button className="import-save-btn" onClick={chooseReplace}>Skip → Replace</button>
          </div>
          <div className="import-save-divider">or skip backup and choose:</div>
          <div className="import-save-actions">
            <button className="import-save-btn" onClick={chooseAppend}>
              Append to active
            </button>
            <button className="import-save-btn import-save-btn--new" onClick={chooseAsNew}>
              Import as New Lorebook
            </button>
            <button className="import-save-btn import-save-btn--cancel" onClick={resetAll}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drop zone — hidden once a file has been parsed with results */}
      {!savePending && !preview?.length && (
        <>
        <p className="import-label">IMPORT</p>
        <DropZone onFile={handleFile} accept=".txt,.docx,.odt,.json">
          <div className="drop-zone-content">
            {loading ? '⏳ Parsing…' : 'Drop a file here or click to browse (TXT, DOCX, ODT, JSON)'}
          </div>
        </DropZone>
        <div className="import-hint">
          <em>Attention</em>: JSON files must match our template format exactly
          (TXT and DOCX formats are more flexible) &ndash; Grab the JSON template below!
        </div>
        </>
      )}

      {error && <div className="import-error">{error}</div>}

      {/* Non-blocking warnings for entries whose name/description fell through
          every field alias and had to be imported blank */}
      {!savePending && preview?.length > 0 && warnings.length > 0 && (
        <div className="import-warning-banner">
          <div className="import-warning-title">
            ⚠ {warnings.length} {warnings.length === 1 ? 'entry' : 'entries'} imported with missing fields
          </div>
          <ul className="import-warning-list">
            {warnings.map((w) => (
              <li key={w.index}>
                Entry #{w.index + 1}: blank {w.fields.join(' and ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Entry preview — shown after the disposition is chosen. The preview's
          replace-warning chip only appears for the destructive 'replace' path. */}
      {!savePending && preview?.length > 0 && (
        <>
          <div className="import-disposition-banner">
            {disposition === 'replace' && <>Will <strong>replace</strong> &ldquo;{lorebookName}&rdquo; with these entries.</>}
            {disposition === 'append'  && <>Will <strong>append</strong> these entries to &ldquo;{lorebookName}&rdquo;.</>}
            {disposition === 'as-new'  && <>Will <strong>create a new lorebook</strong> with these entries.</>}
          </div>
          <ImportPreview
            entries={preview}
            replaceMode={disposition === 'replace'}
            onConfirm={confirm}
            onCancel={resetAll}
          />
        </>
      )}
    </div>
  );
}

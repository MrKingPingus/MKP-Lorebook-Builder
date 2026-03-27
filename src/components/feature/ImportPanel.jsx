// Import tab content — drag-drop zone, auto-detect format, save-warning prompt, and ImportPreview
import { useState } from 'react';
import { DropZone }      from '../ui/DropZone.jsx';
import { ImportPreview } from './ImportPreview.jsx';
import { parseTxtToEntries, readTxtFile } from '../../services/txt-import.js';
import { importFromDocx }                 from '../../services/docx-import.js';
import { readJsonFile, importFromJson }   from '../../services/json-import.js';
import { exportToJsonBlob, downloadBlob } from '../../services/json-export.js';
import { exportToTxtBlob }               from '../../services/txt-export.js';
import { useEntries }       from '../../hooks/use-entries.js';
import { useLorebook }      from '../../hooks/use-lorebook.js';
import { useLorebookStore } from '../../state/lorebook-store.js';
import { useHistoryStore }  from '../../state/history-store.js';

const EXT_TO_FORMAT = { txt: 'txt', docx: 'docx', odt: 'docx', json: 'json' };

export function ImportPanel() {
  const [preview, setPreview]           = useState(null);
  const [importedName, setImportedName] = useState(null);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [savePending, setSavePending]   = useState(false);
  const [asNewLorebook, setAsNewLorebook] = useState(false);

  const { entries }                    = useEntries();
  const { activeLorebook, renameLorebook, createLorebook } = useLorebook();
  const updateActiveEntries            = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot                   = useHistoryStore((s) => s.pushSnapshot);

  function resetAll() {
    setPreview(null);
    setImportedName(null);
    setError('');
    setSavePending(false);
    setAsNewLorebook(false);
  }

  async function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const fmt = EXT_TO_FORMAT[ext];
    if (!fmt) { setError('Unsupported file type.'); return; }

    setError('');
    setPreview(null);
    setImportedName(null);
    setSavePending(false);
    setAsNewLorebook(false);
    setLoading(true);
    try {
      let parsed;
      if (fmt === 'txt') {
        const text = await readTxtFile(file);
        parsed = parseTxtToEntries(text);
      } else if (fmt === 'docx') {
        parsed = await importFromDocx(file);
      } else {
        const raw = await readJsonFile(file);
        const result = importFromJson(raw);
        if (!result.ok) { setError(result.error); return; }
        parsed = result.lorebook.entries;
        setImportedName(result.lorebook.name ?? null);
      }
      setPreview(parsed);
      setSavePending(true);
    } catch (e) {
      setError(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  // Save current lorebook as JSON then proceed to preview
  function saveAsJson() {
    if (activeLorebook) {
      const blob = exportToJsonBlob(activeLorebook);
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      downloadBlob(blob, `${safe}.json`);
    }
    setSavePending(false);
  }

  // Save current lorebook as TXT then proceed to preview
  function saveAsTxt() {
    if (activeLorebook) {
      const blob = exportToTxtBlob(activeLorebook);
      const safe = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
      downloadBlob(blob, `${safe}.txt`);
    }
    setSavePending(false);
  }

  // Import into a brand-new lorebook slot — current lorebook stays untouched
  function chooseAsNew() {
    setAsNewLorebook(true);
    setSavePending(false);
  }

  // Confirm: replace active lorebook entries (and optionally name)
  function confirm() {
    if (!preview) return;
    pushSnapshot({ entries: [...entries] });
    updateActiveEntries(preview);
    if (importedName != null) renameLorebook(importedName);
    resetAll();
  }

  // Confirm: create a new lorebook slot and load the import into it
  function confirmAsNew() {
    if (!preview) return;
    createLorebook();
    updateActiveEntries(preview);
    if (importedName != null) renameLorebook(importedName);
    resetAll();
  }

  const lorebookName = activeLorebook?.name || '(unnamed)';

  return (
    <div className="import-panel">
      {/* Save-warning prompt — shown immediately after a file is parsed */}
      {savePending && preview && (
        <div className="import-save-prompt">
          <div className="import-save-warning">
            ⚠ You&rsquo;re about to replace &ldquo;{lorebookName}&rdquo;
          </div>
          <div className="import-save-label">Save a copy first?</div>
          <div className="import-save-actions">
            <button className="import-save-btn" onClick={saveAsJson}>⬇ JSON</button>
            <button className="import-save-btn" onClick={saveAsTxt}>⬇ TXT</button>
          </div>
          <div className="import-save-divider">or</div>
          <div className="import-save-actions">
            <button className="import-save-btn import-save-btn--new" onClick={chooseAsNew}>
              Import as New Lorebook
            </button>
            <button className="import-save-btn import-save-btn--cancel" onClick={resetAll}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drop zone — hidden once a file has been parsed */}
      {!savePending && !preview && (
        <DropZone onFile={handleFile} accept=".txt,.docx,.odt,.json">
          <div className="drop-zone-content">
            {loading ? '⏳ Parsing…' : 'Drop a file here or click to browse (TXT, DOCX, ODT, JSON)'}
          </div>
        </DropZone>
      )}

      {error && <div className="import-error">{error}</div>}

      {/* Entry preview — shown after save prompt is dismissed */}
      {!savePending && preview && (
        <ImportPreview
          entries={preview}
          replaceMode={!asNewLorebook}
          onConfirm={asNewLorebook ? confirmAsNew : confirm}
          onCancel={resetAll}
        />
      )}
    </div>
  );
}

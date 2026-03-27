// Import tab content — drag-drop zone, click-to-browse, format tabs (TXT/DOCX/JSON), and ImportPreview
import { useState } from 'react';
import { DropZone }      from '../ui/DropZone.jsx';
import { ImportPreview } from './ImportPreview.jsx';
import { parseTxtToEntries, readTxtFile } from '../../services/txt-import.js';
import { importFromDocx }                 from '../../services/docx-import.js';
import { readJsonFile, importFromJson }   from '../../services/json-import.js';
import { useEntries }       from '../../hooks/use-entries.js';
import { useLorebook }      from '../../hooks/use-lorebook.js';
import { useLorebookStore } from '../../state/lorebook-store.js';
import { useHistoryStore }  from '../../state/history-store.js';

const FORMATS = [
  { id: 'txt',  label: 'TXT',  accept: '.txt' },
  { id: 'docx', label: 'DOCX', accept: '.docx' },
  { id: 'json', label: 'JSON', accept: '.json' },
];

export function ImportPanel() {
  const [format, setFormat]         = useState('txt');
  const [preview, setPreview]       = useState(null);
  const [importedName, setImportedName] = useState(null); // set for JSON imports
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const { entries }              = useEntries();
  const { renameLorebook }       = useLorebook();
  const updateActiveEntries      = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot             = useHistoryStore((s) => s.pushSnapshot);

  const currentAccept = FORMATS.find((f) => f.id === format)?.accept ?? '.txt';

  async function handleFile(file) {
    // Auto-detect format from file extension so drag-and-drop always works
    const ext = file.name.split('.').pop().toLowerCase();
    const detected = FORMATS.find((f) => f.accept === `.${ext}`);
    const activeFormat = detected ? detected.id : format;
    if (detected && detected.id !== format) setFormat(detected.id);

    setError('');
    setPreview(null);
    setImportedName(null);
    setLoading(true);
    try {
      let parsed;
      if (activeFormat === 'txt') {
        const text = await readTxtFile(file);
        parsed = parseTxtToEntries(text);
      } else if (activeFormat === 'docx') {
        parsed = await importFromDocx(file);
      } else {
        const raw = await readJsonFile(file);
        const result = importFromJson(raw);
        if (!result.ok) { setError(result.error); return; }
        parsed = result.lorebook.entries;
        // Preserve the lorebook name so confirm() can load the full state
        setImportedName(result.lorebook.name ?? null);
      }
      setPreview(parsed);
    } catch (e) {
      setError(e.message ?? 'Failed to parse file.');
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!preview) return;
    pushSnapshot({ entries: [...entries] });
    if (format === 'json') {
      // Load state: replace entries and name with the imported lorebook
      updateActiveEntries(preview);
      if (importedName != null) renameLorebook(importedName);
    } else {
      // Append for TXT / DOCX
      updateActiveEntries([...entries, ...preview]);
    }
    setPreview(null);
    setImportedName(null);
  }

  return (
    <div className="import-panel">
      <div className="format-tabs">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            className={`format-tab${format === f.id ? ' format-tab--active' : ''}`}
            onClick={() => { setFormat(f.id); setPreview(null); setImportedName(null); setError(''); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DropZone onFile={handleFile} accept={currentAccept}>
        <div className="drop-zone-content">
          {loading ? '⏳ Parsing…' : `Drop a ${format.toUpperCase()} file here or click to browse`}
        </div>
      </DropZone>

      {error && <div className="import-error">{error}</div>}

      {preview && (
        <ImportPreview
          entries={preview}
          replaceMode={format === 'json'}
          onConfirm={confirm}
          onCancel={() => { setPreview(null); setImportedName(null); }}
        />
      )}
    </div>
  );
}

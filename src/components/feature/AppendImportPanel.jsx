// Overlay for appending entries to the active lorebook — triggered by the footer "Import Entries" button
import { useState }          from 'react';
import { useAppendImport }   from '../../hooks/use-append-import.js';
import { ImportPreview }     from './ImportPreview.jsx';

export function AppendImportPanel() {
  const { preview, loading, error, handleText, handleFile, confirmAppend, cancel, openFullImport } = useAppendImport();
  const [text, setText]       = useState('');
  const [dragging, setDragging] = useState(false);

  function onDragEnter(e) { e.preventDefault(); setDragging(true); }
  function onDragOver(e)  { e.preventDefault(); }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="append-import-overlay">
      <div
        className="append-import-panel"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="append-import-header">
          <span className="append-import-title">Add Entries</span>
          <button className="append-import-close" onClick={cancel} title="Close">×</button>
        </div>

        {!preview && (
          <>
            <div className="append-redirect">
              <span className="append-redirect-text">Need to import an entire lorebook? Go here!</span>
              <button
                className="append-redirect-btn"
                onClick={openFullImport}
              >
                Open Import / Export
              </button>
            </div>
            <textarea
              className="append-text-area"
              placeholder={'Paste entries here, or drag a file onto this panel…\n\nSupported formats: TXT, DOCX, ODT, JSON'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="append-parse-btn"
              onClick={() => handleText(text)}
              disabled={!text.trim() || loading}
            >
              {loading ? 'Parsing…' : 'Parse'}
            </button>
          </>
        )}

        {error && <div className="import-error">{error}</div>}

        {preview && (
          <ImportPreview
            entries={preview}
            replaceMode={false}
            onConfirm={confirmAppend}
            onCancel={cancel}
          />
        )}

        {dragging && (
          <div className="append-drop-overlay">Drop file to import</div>
        )}
      </div>
    </div>
  );
}

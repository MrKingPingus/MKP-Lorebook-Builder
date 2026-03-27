// Overlay for appending entries to the active lorebook — triggered by the footer "Import Entries" button
import { useAppendImport } from '../../hooks/use-append-import.js';
import { DropZone }        from '../ui/DropZone.jsx';
import { ImportPreview }   from './ImportPreview.jsx';

export function AppendImportPanel() {
  const { preview, loading, error, handleFile, confirmAppend, cancel } = useAppendImport();

  return (
    <div className="append-import-overlay">
      <div className="append-import-panel">
        <div className="append-import-header">
          <span className="append-import-title">Add Entries</span>
          <button className="append-import-close" onClick={cancel} title="Close">×</button>
        </div>

        {!preview && (
          <DropZone onFile={handleFile} accept=".txt,.docx,.odt,.json">
            <div className="drop-zone-content">
              {loading ? '⏳ Parsing…' : 'Drop a file here or click to browse (TXT, DOCX, ODT, JSON)'}
            </div>
          </DropZone>
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
      </div>
    </div>
  );
}

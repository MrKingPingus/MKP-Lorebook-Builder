// Overlay for the footer "Import Entries" button. Three modes selectable from
// a segmented control at the top of the panel:
//   - paste        : paste a block of entries into the textarea, parse, append
//   - file-entries : drop / pick a file, parse, append entries to active book
//   - file-book    : drop / pick a file, parse, then Replace or Import as New
import { useState }          from 'react';
import { useAppendImport }   from '../../hooks/use-append-import.js';
import { useEntries }        from '../../hooks/use-entries.js';
import { useLorebook }       from '../../hooks/use-lorebook.js';
import { ImportPreview }     from './ImportPreview.jsx';

const MODES = [
  { id: 'paste',        label: 'Paste entries' },
  { id: 'file-entries', label: 'Entries from file' },
  { id: 'file-book',    label: 'Whole book from file' },
];

export function AppendImportPanel() {
  const {
    preview,
    importedName,
    loading,
    error,
    handleText,
    handleFile,
    confirmAppend,
    confirmReplace,
    confirmAsNew,
    cancel,
    clearParseState,
    openFullImport,
  } = useAppendImport();
  const { activeLorebook } = useLorebook();
  const { entries }        = useEntries();
  const [mode, setMode]    = useState('paste');
  const [text, setText]    = useState('');
  const [dragging, setDragging] = useState(false);

  function onDragEnter(e) { e.preventDefault(); setDragging(true); }
  function onDragOver(e)  { e.preventDefault(); }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    // Drops are ignored in paste mode — that mode is text-only on purpose.
    if (mode === 'paste') return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onPickFile(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Clear the input so the same file can be re-picked after a cancel
    e.target.value = '';
  }

  // Soft reset on mode change — clears the textarea AND any stale preview /
  // error from the previous mode without closing the popup.
  function resetForModeSwitch(next) {
    setMode(next);
    setText('');
    clearParseState();
  }

  const lorebookName = activeLorebook?.name || '(unnamed)';
  const showPasteUi  = mode === 'paste'        && !preview;
  const showFileUi   = (mode === 'file-entries' || mode === 'file-book') && !preview;
  const isBookMode   = mode === 'file-book';

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
          <span className="append-import-title">Import</span>
          <button className="append-import-close" onClick={cancel} title="Close">×</button>
        </div>

        {!preview && (
          <div className="append-import-mode-bar" role="tablist">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                className={`append-import-mode-btn${mode === m.id ? ' append-import-mode-btn--active' : ''}`}
                onClick={() => resetForModeSwitch(m.id)}
                type="button"
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {showPasteUi && (
          <>
            <div className="append-redirect">
              <span className="append-redirect-text">Need a backup-first or non-default confirmation flow?</span>
              <button className="append-redirect-btn" onClick={openFullImport}>
                Open Import / Export tab
              </button>
            </div>
            <textarea
              className="append-text-area"
              placeholder={'Paste entries here…\n\nSupported formats: TXT-style entry blocks.'}
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

        {showFileUi && (
          <>
            <div className="append-redirect">
              <span className="append-redirect-text">
                {isBookMode
                  ? 'For a save-backup-first flow, use the Import / Export tab.'
                  : 'Need a save-backup-first or whole-book flow? Open the Import / Export tab.'}
              </span>
              <button className="append-redirect-btn" onClick={openFullImport}>
                Open Import / Export tab
              </button>
            </div>
            <label className="append-file-picker">
              <input
                type="file"
                accept=".txt,.docx,.odt,.json"
                onChange={onPickFile}
                disabled={loading}
              />
              <span className="append-file-picker-label">
                {loading
                  ? '⏳ Parsing…'
                  : (isBookMode
                      ? 'Drop a lorebook file here or click to browse (TXT, DOCX, ODT, JSON)'
                      : 'Drop a file here or click to browse (TXT, DOCX, ODT, JSON)')}
              </span>
            </label>
          </>
        )}

        {error && <div className="import-error">{error}</div>}

        {preview && !isBookMode && (
          <>
            <div className="import-disposition-banner">
              Will <strong>append</strong> {preview.length} {preview.length === 1 ? 'entry' : 'entries'} to &ldquo;{lorebookName}&rdquo;.
            </div>
            <ImportPreview
              entries={preview}
              replaceMode={false}
              onConfirm={confirmAppend}
              onCancel={cancel}
            />
          </>
        )}

        {preview && isBookMode && (
          <>
            <div className="import-disposition-banner">
              Importing {preview.length} {preview.length === 1 ? 'entry' : 'entries'}
              {importedName ? <> from &ldquo;{importedName}&rdquo;</> : null}.
              Choose how to apply:
            </div>
            <ImportPreview
              entries={preview}
              hideActions
            />
            <div className="append-book-actions">
              <button className="import-save-btn" onClick={confirmReplace}>
                Replace &ldquo;{lorebookName}&rdquo;
              </button>
              <button className="import-save-btn import-save-btn--new" onClick={confirmAsNew}>
                Import as New Lorebook
              </button>
              <button className="import-save-btn import-save-btn--cancel" onClick={cancel}>
                Cancel
              </button>
            </div>
          </>
        )}

        {dragging && mode !== 'paste' && (
          <div className="append-drop-overlay">Drop file to import</div>
        )}
      </div>
    </div>
  );
}

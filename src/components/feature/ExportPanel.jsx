// Export tab content — JSON/TXT/DOCX download buttons, clipboard copy, template downloads, and clear all
import { useState, useRef, useEffect } from 'react';
import { useEntries }   from '../../hooks/use-entries.js';
import { useLorebook }  from '../../hooks/use-lorebook.js';
import { useExport }    from '../../hooks/use-export.js';
import { DUPE_FLASH_MS } from '../../constants/limits.js';

export function ExportPanel() {
  const { entries, clearAllEntries }   = useEntries();
  const { activeLorebook, renameLorebook } = useLorebook();
  const { exportJson: doExportJson, exportTxt: doExportTxt, exportDocx: doExportDocx,
          copyJsonToClipboard, downloadJsonTemplate, downloadTxtTemplate, downloadDocxTemplate,
          copyJsonTemplate, copyTxtTemplate } = useExport();
  // Which template-copy button is currently flashing "Copied" — null, 'json', or 'txt'.
  const [copiedFlash, setCopiedFlash] = useState(null);
  const flashTimer = useRef(null);

  // User-editable override for the download filename (without extension). Resets to the
  // lorebook's sanitized name when switching books.
  const defaultName = (activeLorebook?.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
  const [filenameOverride, setFilenameOverride] = useState(defaultName);
  useEffect(() => { setFilenameOverride(defaultName); }, [activeLorebook?.id]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  async function runCopy(which, fn) {
    try {
      await fn();
      setCopiedFlash(which);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setCopiedFlash(null), DUPE_FLASH_MS);
    } catch {
      // Clipboard unavailable or denied — download button remains available as fallback.
    }
  }

  if (!activeLorebook) return <div className="export-panel export-panel--empty">No lorebook loaded.</div>;

  // Sanitize the user's input at export time — fall back to the lorebook's safe name if blank.
  function resolveFilename() {
    const cleaned = filenameOverride.replace(/[^a-z0-9_-]/gi, '_').replace(/^_+|_+$/g, '');
    return cleaned || defaultName || 'lorebook';
  }

  function exportJson() {
    doExportJson(activeLorebook, `${resolveFilename()}.json`);
  }

  function exportTxt() {
    doExportTxt(activeLorebook, `${resolveFilename()}.txt`);
  }

  function exportDocx() {
    doExportDocx(activeLorebook, `${resolveFilename()}.docx`);
  }

  async function copyToClipboard() {
    await copyJsonToClipboard(activeLorebook);
  }

  function clearAll() {
    if (!window.confirm('Are you sure?')) return;
    clearAllEntries();
    renameLorebook('');
  }

  return (
    <div className="export-panel">
      <p className="import-label">EXPORT</p>
      <div className="export-info">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in &quot;{activeLorebook.name || '(unnamed)'}&quot;
      </div>

      <div className="export-section">
        <div className="export-section-label">Download</div>
        <div className="export-filename-row">
          <label className="export-filename-label" htmlFor="export-filename">Filename</label>
          <input
            id="export-filename"
            className="export-filename-input"
            value={filenameOverride}
            onChange={(e) => setFilenameOverride(e.target.value)}
            placeholder={defaultName}
            spellCheck={false}
            title="Download filename (without extension) — letters, numbers, underscore, and hyphen only"
          />
        </div>
        <div className="export-actions">
          <button className="export-btn" onClick={exportJson}>⬇ JSON</button>
          <button className="export-btn" onClick={exportTxt}>⬇ TXT</button>
          <button className="export-btn" onClick={exportDocx}>⬇ DOCX</button>
          <button className="export-btn export-btn--outline" onClick={copyToClipboard}>⎘ Copy JSON</button>
        </div>
      </div>

      <div className="export-section">
        <div className="export-section-label">Templates</div>
        <div className="export-actions">
          <button className="export-btn export-btn--outline" onClick={downloadJsonTemplate}>⬇ JSON</button>
          <button
            className="export-btn export-btn--outline"
            onClick={() => runCopy('json', copyJsonTemplate)}
            title="Copy JSON template to clipboard"
          >
            {copiedFlash === 'json' ? '✓ Copied' : '⎘ Copy JSON'}
          </button>
          <button className="export-btn export-btn--outline" onClick={downloadTxtTemplate}>⬇ TXT</button>
          <button
            className="export-btn export-btn--outline"
            onClick={() => runCopy('txt', copyTxtTemplate)}
            title="Copy TXT template to clipboard"
          >
            {copiedFlash === 'txt' ? '✓ Copied' : '⎘ Copy TXT'}
          </button>
          <button className="export-btn export-btn--outline" onClick={downloadDocxTemplate}>⬇ DOCX</button>
        </div>
      </div>

      <div className="export-section">
        <div className="export-section-label">Danger zone</div>
        <button className="export-btn export-btn--danger" onClick={clearAll}>
          ✕ Clear all entries
        </button>
      </div>
    </div>
  );
}

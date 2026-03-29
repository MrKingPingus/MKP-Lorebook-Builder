// Export tab content — JSON/TXT/DOCX download buttons, clipboard copy, template downloads, and clear all
import { useEntries }   from '../../hooks/use-entries.js';
import { useLorebook }  from '../../hooks/use-lorebook.js';
import { useExport }    from '../../hooks/use-export.js';

export function ExportPanel() {
  const { entries, clearAllEntries }   = useEntries();
  const { activeLorebook, renameLorebook } = useLorebook();
  const { exportJson: doExportJson, exportTxt: doExportTxt, exportDocx: doExportDocx,
          copyJsonToClipboard, downloadTxtTemplate, downloadDocxTemplate } = useExport();

  if (!activeLorebook) return <div className="export-panel export-panel--empty">No lorebook loaded.</div>;

  const safeName = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');

  function exportJson() {
    doExportJson(activeLorebook, `${safeName}.json`);
  }

  function exportTxt() {
    doExportTxt(activeLorebook, `${safeName}.txt`);
  }

  function exportDocx() {
    doExportDocx(activeLorebook, `${safeName}.docx`);
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
      <div className="export-info">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in &quot;{activeLorebook.name || '(unnamed)'}&quot;
      </div>

      <div className="export-section">
        <div className="export-section-label">Download</div>
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
          <button className="export-btn export-btn--outline" onClick={downloadTxtTemplate}>⬇ TXT template</button>
          <button className="export-btn export-btn--outline" onClick={downloadDocxTemplate}>⬇ DOCX template</button>
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

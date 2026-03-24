// Export tab content — JSON/TXT/DOCX download buttons, clipboard copy, and template downloads
import { useEntries } from '../../hooks/use-entries.js';
import { useLorebook } from '../../hooks/use-lorebook.js';
import { exportToJsonBlob, downloadBlob } from '../../services/json-export.js';
import { exportToTxtBlob }  from '../../services/txt-export.js';
import { exportToDocxBlob } from '../../services/docx-export.js';

const TXT_TEMPLATE = `=== Character Name [character] ===
Triggers: name, nickname, alias

Enter description here.

---

=== Location Name [location] ===
Triggers: place, location

Enter description here.
`;

export function ExportPanel() {
  const { entries } = useEntries();
  const { activeLorebook } = useLorebook();

  if (!activeLorebook) return <div className="export-panel export-panel--empty">No lorebook loaded.</div>;

  const safeName = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');

  async function exportJson() {
    const blob = exportToJsonBlob(activeLorebook);
    downloadBlob(blob, `${safeName}.json`);
  }

  async function exportTxt() {
    const blob = exportToTxtBlob(activeLorebook);
    downloadBlob(blob, `${safeName}.txt`);
  }

  async function exportDocx() {
    const blob = exportToDocxBlob(activeLorebook);
    downloadBlob(blob, `${safeName}.docx`);
  }

  async function copyToClipboard() {
    const json = JSON.stringify(activeLorebook, null, 2);
    await navigator.clipboard.writeText(json);
  }

  function downloadTemplate() {
    const blob = new Blob([TXT_TEMPLATE], { type: 'text/plain' });
    downloadBlob(blob, 'lorebook-template.txt');
  }

  return (
    <div className="export-panel">
      <div className="export-info">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in &quot;{activeLorebook.name || '(unnamed)'}&quot;
      </div>
      <div className="export-actions">
        <button className="export-btn" onClick={exportJson}>⬇ JSON</button>
        <button className="export-btn" onClick={exportTxt}>⬇ TXT</button>
        <button className="export-btn" onClick={exportDocx}>⬇ DOCX</button>
        <button className="export-btn export-btn--outline" onClick={copyToClipboard}>⎘ Copy JSON</button>
      </div>
      <div className="export-section">
        <div className="export-section-label">Templates</div>
        <button className="export-btn export-btn--outline" onClick={downloadTemplate}>⬇ TXT template</button>
      </div>
    </div>
  );
}

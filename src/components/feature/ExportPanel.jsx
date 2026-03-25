// Export tab content — JSON/TXT/DOCX download buttons, clipboard copy, template downloads, and clear all
import { useEntries }   from '../../hooks/use-entries.js';
import { useLorebook }  from '../../hooks/use-lorebook.js';
import { useLorebookStore } from '../../state/lorebook-store.js';
import { useHistoryStore }  from '../../state/history-store.js';
import { exportToJsonBlob, downloadBlob } from '../../services/json-export.js';
import { exportToTxtBlob }               from '../../services/txt-export.js';
import { exportToDocxBlob }              from '../../services/docx-export.js';

const TEMPLATE_LOREBOOK = {
  id:   'template',
  name: 'Template Lorebook',
  entries: [
    {
      id:          'tpl-1',
      name:        'Character Name',
      type:        'character',
      triggers:    ['name', 'nickname', 'alias'],
      description: 'Enter a description of this character here.',
    },
    {
      id:          'tpl-2',
      name:        'Location Name',
      type:        'location',
      triggers:    ['place', 'location name'],
      description: 'Describe this location here.',
    },
  ],
};

export function ExportPanel() {
  const { entries }          = useEntries();
  const { activeLorebook, renameLorebook } = useLorebook();
  const updateActiveEntries  = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot         = useHistoryStore((s) => s.pushSnapshot);

  if (!activeLorebook) return <div className="export-panel export-panel--empty">No lorebook loaded.</div>;

  const safeName = (activeLorebook.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');

  function exportJson() {
    const blob = exportToJsonBlob(activeLorebook);
    downloadBlob(blob, `${safeName}.json`);
  }

  function exportTxt() {
    const blob = exportToTxtBlob(activeLorebook);
    downloadBlob(blob, `${safeName}.txt`);
  }

  function exportDocx() {
    const blob = exportToDocxBlob(activeLorebook);
    downloadBlob(blob, `${safeName}.docx`);
  }

  async function copyToClipboard() {
    const json = JSON.stringify(activeLorebook, null, 2);
    await navigator.clipboard.writeText(json);
  }

  function downloadTxtTemplate() {
    const blob = exportToTxtBlob(TEMPLATE_LOREBOOK);
    downloadBlob(blob, 'lorebook-template.txt');
  }

  function downloadDocxTemplate() {
    const blob = exportToDocxBlob(TEMPLATE_LOREBOOK);
    downloadBlob(blob, 'lorebook-template.docx');
  }

  function clearAll() {
    if (!window.confirm('Are you sure?')) return;
    pushSnapshot({ entries: [...entries] });
    updateActiveEntries([]);
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

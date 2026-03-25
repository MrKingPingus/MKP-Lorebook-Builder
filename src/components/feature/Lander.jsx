// Static lander page — shown as the scrollable background behind the floating window
import { exportToTxtBlob }  from '../../services/txt-export.js';
import { exportToDocxBlob } from '../../services/docx-export.js';
import { downloadBlob }     from '../../services/json-export.js';

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

const GH_PAGES_URL = 'https://mrkingpingus.github.io/mkp-lorebook-builder/';

export function Lander() {
  function downloadTxtTemplate() {
    const blob = exportToTxtBlob(TEMPLATE_LOREBOOK);
    downloadBlob(blob, 'lorebook-template.txt');
  }

  function downloadDocxTemplate() {
    const blob = exportToDocxBlob(TEMPLATE_LOREBOOK);
    downloadBlob(blob, 'lorebook-template.docx');
  }

  return (
    <div className="lander">
      <div className="lander-hero">
        <div className="lander-logo">📖</div>
        <h1 className="lander-title">MKP Lorebook Builder</h1>
        <p className="lander-tagline">
          Build rich AI lorebooks with triggers, descriptions, and type-aware suggestions — right in your browser.
        </p>
        <div className="lander-cta-row">
          <a className="lander-cta-btn" href={GH_PAGES_URL} target="_blank" rel="noopener noreferrer">
            Open on GitHub Pages ↗
          </a>
        </div>
      </div>

      <div className="lander-section">
        <h2 className="lander-section-title">Import Templates</h2>
        <p className="lander-section-text">
          Download a blank template to fill out offline, then import it back into the app.
        </p>
        <div className="lander-template-row">
          <button className="lander-template-btn" onClick={downloadTxtTemplate}>⬇ TXT template</button>
          <button className="lander-template-btn" onClick={downloadDocxTemplate}>⬇ DOCX template</button>
        </div>
      </div>

      <div className="lander-section">
        <h2 className="lander-section-title">Desktop Setup</h2>
        <ol className="lander-steps">
          <li>Open the app in your browser at the GitHub Pages link above.</li>
          <li>Use the floating window to create entries with names, types, triggers, and descriptions.</li>
          <li>Your lorebook is saved automatically — just leave the tab open.</li>
          <li>When you're done, export as <strong>JSON</strong> (for AI tools), <strong>TXT</strong>, or <strong>DOCX</strong> from the <em>Import / Export</em> tab.</li>
          <li>To import an existing lorebook, drag-drop or browse for a <code>.json</code>, <code>.txt</code>, or <code>.docx</code> file in the Import / Export tab.</li>
          <li>Use <kbd>Alt+N</kbd> to add a new entry quickly, <kbd>Ctrl+Z</kbd> to undo, and <kbd>Ctrl+Shift+Z</kbd> to redo.</li>
        </ol>
      </div>
    </div>
  );
}

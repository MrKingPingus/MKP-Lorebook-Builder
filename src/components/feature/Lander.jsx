// Launch view — shown inside the floating window on page load; dismissed via "Start Building"
import { useUi }               from '../../hooks/use-ui.js';
import { useExport }           from '../../hooks/use-export.js';

export function Lander() {
  const setShowLander = useUi((s) => s.setShowLander);
  const setActiveTab  = useUi((s) => s.setActiveTab);
  const { downloadTxtTemplate, downloadDocxTemplate } = useExport();

  function enterBuilder() {
    setActiveTab('build');
    setShowLander(false);
  }

  return (
    <div className="lander">
      <div className="lander-hero">
        <div className="lander-logo">📖</div>
        <h1 className="lander-title">MKP Lorebook Builder</h1>
        <p className="lander-tagline">
          Build rich AI lorebooks with triggers, descriptions, and type-aware suggestions — right in your browser.
        </p>
        <button className="lander-start-btn" onClick={enterBuilder}>
          Start Building →
        </button>
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
        <h2 className="lander-section-title">How It Works</h2>
        <ol className="lander-steps">
          <li>Click <strong>Start Building</strong> above to open the builder.</li>
          <li>Create entries with names, types, triggers, and descriptions.</li>
          <li>Your lorebook is saved automatically — just leave the tab open.</li>
          <li>When you're done, export as <strong>JSON</strong> (for AI tools), <strong>TXT</strong>, or <strong>DOCX</strong> from the <em>Import / Export</em> tab.</li>
          <li>To import an existing lorebook, use the Import / Export tab and drop in a <code>.json</code>, <code>.txt</code>, or <code>.docx</code> file.</li>
          <li>Use <kbd>Alt+N</kbd> to add a new entry quickly, <kbd>Ctrl+Z</kbd> to undo, and <kbd>Ctrl+Y</kbd> to redo.</li>
        </ol>
      </div>
    </div>
  );
}

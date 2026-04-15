// Launch view — shown inside the floating window on page load; dismissed via "Start Building"
import { useState, useRef, useEffect } from 'react';
import { useUi }               from '../../hooks/use-ui.js';
import { useExport }           from '../../hooks/use-export.js';
import { DUPE_FLASH_MS }       from '../../constants/limits.js';

export function Lander() {
  const setShowLander = useUi((s) => s.setShowLander);
  const {
    downloadTxtTemplate, downloadDocxTemplate,
    copyTxtTemplate,
  } = useExport();
  const [copiedFlash, setCopiedFlash] = useState(false);
  const flashTimer = useRef(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  async function onCopyTxt() {
    try {
      await copyTxtTemplate();
      setCopiedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setCopiedFlash(false), DUPE_FLASH_MS);
    } catch {
      // Clipboard API unavailable or denied — fail silently; download remains available.
    }
  }

  function enterBuilder() {
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
          <button className="lander-template-btn" onClick={onCopyTxt} title="Copy TXT template to clipboard">
            {copiedFlash ? '✓ Copied' : '⎘ Copy TXT'}
          </button>
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

      <div className="lander-section">
        <h2 className="lander-section-title">Tips</h2>
        <ul className="lander-tips">
          <li>Hover over buttons and controls for help hints.</li>
          <li>Double-click an entry header to expand or collapse it.</li>
          <li>Paste a comma-separated list into the trigger field to add multiple triggers at once.</li>
          <li>Drag the <strong>⠿</strong> handle on any entry to reorder it in the list.</li>
          <li>Shift+scroll on the type selector inside an expanded entry to cycle through entry types.</li>
        </ul>
        <p className="lander-readme-link">
          For more tips and information, check out the{' '}
          <a
            href="https://github.com/mrkingpingus/mkp-lorebook-builder"
            target="_blank"
            rel="noreferrer"
            className="lander-link"
          >
            readme
          </a>!
        </p>
      </div>
    </div>
  );
}

// Launch view — shown inside the floating window on page load; dismissed via
// any Start tile, a Recent lorebook, or the "Continue to builder" link.
// Five panels: hero, Start tiles, Recent lorebooks, What's New (bundled
// CHANGELOG), Learn (tutorial + tips + templates), Report a Bug / Request a Feature.
import { useState, useRef, useEffect, Fragment } from 'react';
import { useUi }                from '../../hooks/use-ui.js';
import { useKeybindings }       from '../../hooks/use-keybindings.js';
import { useExport }            from '../../hooks/use-export.js';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useLorebook }          from '../../hooks/use-lorebook.js';
import { parseMarkdown }        from '../../services/markdown-parse.js';
import { DUPE_FLASH_MS }        from '../../constants/limits.js';
import changelogRaw             from '../../../CHANGELOG.md?raw';

// Render the inline-span AST emitted by markdown-parse into React nodes.
function renderInline(spans, keyPrefix) {
  return spans.map((s, idx) => {
    const k = `${keyPrefix}-${idx}`;
    if (s.type === 'text')   return <Fragment key={k}>{s.text}</Fragment>;
    if (s.type === 'code')   return <code key={k} className="md-code">{s.text}</code>;
    if (s.type === 'bold')   return <strong key={k}>{renderInline(s.children, k)}</strong>;
    if (s.type === 'italic') return <em key={k}>{renderInline(s.children, k)}</em>;
    if (s.type === 'link')   return (
      <a key={k} href={s.url} target="_blank" rel="noreferrer" className="md-link">
        {renderInline(s.children, k)}
      </a>
    );
    return null;
  });
}

// Render the block-level AST into React nodes.
function renderMarkdown(src) {
  const blocks = parseMarkdown(src);
  return blocks.map((b, idx) => {
    const k = `md-${idx}`;
    if (b.type === 'hr') return <hr key={k} className="md-hr" />;
    if (b.type === 'h1') return <h1 key={k} className="md-h1">{renderInline(b.inline, k)}</h1>;
    if (b.type === 'h2') return <h2 key={k} className="md-h2">{renderInline(b.inline, k)}</h2>;
    if (b.type === 'h3') return <h3 key={k} className="md-h3">{renderInline(b.inline, k)}</h3>;
    if (b.type === 'p')  return <p  key={k} className="md-p">{renderInline(b.inline, k)}</p>;
    if (b.type === 'ul' || b.type === 'ol') {
      const Tag = b.type;
      return (
        <Tag key={k} className={`md-${b.type}`}>
          {b.items.map((item, j) => (
            <li key={`${k}-li${j}`}>{renderInline(item, `${k}-li${j}`)}</li>
          ))}
        </Tag>
      );
    }
    return null;
  });
}

const RECENT_LIMIT = 6;

const ISSUE_NEW_BASE = 'https://github.com/mrkingpingus/mkp-lorebook-builder/issues/new';
const BUG_REPORT_URL      = ISSUE_NEW_BASE + '?template=bug_report.yml';
const FEATURE_REQUEST_URL = ISSUE_NEW_BASE + '?template=feature_request.yml';

export function Lander() {
  const setShowLander       = useUi((s) => s.setShowLander);
  const setActiveMenuPanel  = useUi((s) => s.setActiveMenuPanel);
  const setShowAppendImport = useUi((s) => s.setShowAppendImport);
  const setPendingImportFilePick = useUi((s) => s.setPendingImportFilePick);
  const { displayChord }    = useKeybindings();
  const {
    downloadTxtTemplate, downloadDocxTemplate,
    copyTxtTemplate,
  } = useExport();
  const { items, switchLorebook } = useLorebookSwitcher();
  const { createLorebook }        = useLorebook();
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

  function onNewLorebook() {
    createLorebook();
    setShowLander(false);
  }

  function onImportFile() {
    setShowLander(false);
    setActiveMenuPanel('import-export');
    // Jump straight to the OS file picker — the click's transient activation
    // carries through to ImportPanel's auto-open. (Paste has its own tile.)
    setPendingImportFilePick(true);
  }

  function onImportPaste() {
    setShowLander(false);
    setShowAppendImport(true);
  }

  function onOpenRecent(id) {
    switchLorebook(id);
    setShowLander(false);
  }

  const recents = items.slice(0, RECENT_LIMIT);

  return (
    <div className="lander">
      <div className="lander-hero">
        <div className="lander-logo">📖</div>
        <h1 className="lander-title">MKP Lorebook Builder</h1>
        <p className="lander-tagline">
          Build rich AI lorebooks with triggers, descriptions, and type-aware suggestions — right in your browser.
        </p>
      </div>

      <div className="lander-tiles">
        <button className="lander-tile lander-tile--primary" onClick={onNewLorebook}>
          <div className="lander-tile-icon">＋</div>
          <div className="lander-tile-title">New Lorebook</div>
          <div className="lander-tile-sub">Start with a blank book</div>
        </button>
        <button className="lander-tile" onClick={onImportFile}>
          <div className="lander-tile-icon">📁</div>
          <div className="lander-tile-title">Import File</div>
          <div className="lander-tile-sub">JSON, TXT, DOCX, ODT</div>
        </button>
        <button className="lander-tile" onClick={onImportPaste}>
          <div className="lander-tile-icon">⎘</div>
          <div className="lander-tile-title">Import Paste</div>
          <div className="lander-tile-sub">Paste entries from clipboard</div>
        </button>
      </div>

      {recents.length > 0 && (
        <div className="lander-section">
          <h2 className="lander-section-title">Recent lorebooks</h2>
          <div className="lander-recent-list">
            {recents.map((item) => (
              <button
                key={item.id}
                className={`lander-recent-item${item.isActive ? ' lander-recent-item--active' : ''}`}
                onClick={() => onOpenRecent(item.id)}
                title={item.isActive ? 'Currently active — click to enter the builder' : 'Open this lorebook'}
              >
                <span className="lander-recent-name">{item.name || '(unnamed)'}</span>
                <span className="lander-recent-time">{item.relativeTime}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="lander-section">
        <h2 className="lander-section-title">What's new</h2>
        <div className="lander-changelog">
          {renderMarkdown(changelogRaw)}
        </div>
      </div>

      <div className="lander-section">
        <h2 className="lander-section-title">Learn</h2>

        <h3 className="lander-subsection-title">How it works</h3>
        <ol className="lander-steps">
          <li>Click a Start tile above to create or import a lorebook.</li>
          <li>Create entries with names, types, triggers, and descriptions.</li>
          <li>Your lorebook is saved automatically — just leave the tab open.</li>
          <li>When you're done, export as <strong>JSON</strong> (for AI tools), <strong>TXT</strong>, or <strong>DOCX</strong> from the <em>Import / Export</em> tab.</li>
          <li>To import an existing lorebook, use the Import / Export tab and drop in a <code>.json</code>, <code>.txt</code>, <code>.docx</code>, or <code>.odt</code> file.</li>
          <li>Use <kbd>{displayChord('new_entry')}</kbd> to add a new entry, <kbd>{displayChord('undo')}</kbd> to undo, <kbd>{displayChord('redo')}</kbd> to redo, and <kbd>Esc</kbd> to exit bulk-select mode. Press <kbd>?</kbd> anytime for the full shortcut list.</li>
        </ol>

        <h3 className="lander-subsection-title">Tips</h3>
        <ul className="lander-tips">
          <li>Hover over buttons and controls for help hints.</li>
          <li>Double-click an entry header to expand or collapse it.</li>
          <li>Paste a comma-separated list into the trigger field to add multiple triggers at once.</li>
          <li>Drag the <strong>⠿</strong> handle on any entry to reorder it in the list.</li>
          <li>Shift+scroll on the type selector inside an expanded entry to cycle through entry types.</li>
          <li>Turn on Entry History in Settings to enable per-entry snapshots and rollback.</li>
        </ul>

        <h3 className="lander-subsection-title">Import templates</h3>
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

        <p className="lander-readme-link">
          For more tips and information, check out the{' '}
          <a
            href="https://github.com/mrkingpingus/mkp-lorebook-builder"
            target="_blank"
            rel="noreferrer"
            className="lander-link"
          >
            readme
          </a>.
        </p>
      </div>

      <div className="lander-footer">
        <div className="lander-footer-links">
          <a
            href={BUG_REPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="lander-bug-link"
          >
            🐞 Report a bug
          </a>
          <a
            href={FEATURE_REQUEST_URL}
            target="_blank"
            rel="noreferrer"
            className="lander-bug-link"
          >
            💡 Request a feature
          </a>
        </div>
        <button className="lander-continue-btn" onClick={enterBuilder}>
          Continue to builder →
        </button>
      </div>
    </div>
  );
}

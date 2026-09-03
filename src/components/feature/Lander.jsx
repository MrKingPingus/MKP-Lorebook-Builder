// Launch view — shown inside the floating window on page load; dismissed via
// any Start tile, a Recent lorebook, or the "Continue to builder" link.
// Five panels: hero, Start tiles, Recent lorebooks, What's New (bundled
// CHANGELOG), Learn (tutorial + tips + templates), Report a Bug / Request a Feature.
import { useState, useRef, useEffect } from 'react';
import { useUi }                from '../../hooks/use-ui.js';
import { useKeybindings }       from '../../hooks/use-keybindings.js';
import { useExport }            from '../../hooks/use-export.js';
import { useLorebookSwitcher }  from '../../hooks/use-lorebook-switcher.js';
import { useLorebook }          from '../../hooks/use-lorebook.js';
import { useImport }            from '../../hooks/use-import.js';
import { useReleaseNotes }      from '../../hooks/use-release-notes.js';
import { MarkdownView }         from '../ui/MarkdownView.jsx';
import { UpdateNotice }         from './UpdateNotice.jsx';
import { useTourLauncher }      from '../../hooks/use-tour.js';
import { DUPE_FLASH_MS }        from '../../constants/limits.js';
import { BUG_REPORT_URL, FEATURE_REQUEST_URL } from '../../constants/links.js';
import changelogRaw             from '../../../CHANGELOG.md?raw';

const RECENT_LIMIT = 6;

export function Lander() {
  const setShowLander       = useUi((s) => s.setShowLander);
  const setShowAppendImport = useUi((s) => s.setShowAppendImport);
  const setPendingFocusLorebookName = useUi((s) => s.setPendingFocusLorebookName);
  const { displayChord }    = useKeybindings();
  const {
    downloadTxtTemplate, downloadDocxTemplate,
    copyTxtTemplate,
  } = useExport();
  const { items, switchLorebook }               = useLorebookSwitcher();
  const { createLorebook, importAsNewLorebook } = useLorebook();
  const { parseFile }                           = useImport();
  const [copiedFlash, setCopiedFlash] = useState(false);
  const { open: noticeOpen, release, dismiss: dismissNotice } = useReleaseNotes();
  const { hasTour, startTour } = useTourLauncher();
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);
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

  // Import File tile → straight to the OS picker via a hidden input on the
  // lander. We parse and load the book here directly instead of routing through
  // the full Import/Export panel: starting from the lander there's no existing
  // book to protect, so the append / replace / save-backup prompts (and the
  // "Name your lorebook" modal) would just be noise. Paste keeps its own tile.
  function onImportFile() {
    setImportError('');
    fileInputRef.current?.click();
  }

  async function onImportFileChosen(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the user re-pick the same file after an error
    if (!file) return;
    try {
      const { entries, name } = await parseFile(file);
      // Fall back to the file's own name (sans extension) so TXT/DOCX imports
      // land named — and importAsNewLorebook creates the book silently when a
      // name is present, so no "Name your lorebook" prompt for an import.
      const base = file.name.replace(/\.[^.]+$/, '');
      importAsNewLorebook({ entries, name: name ?? base });
      // The imported book already has a name — clear the first-run "Name your
      // lorebook" prompt the bootstrap set for the placeholder book.
      setPendingFocusLorebookName(false);
      setShowLander(false);
    } catch (err) {
      setImportError(err.message ?? 'Failed to import file.');
    }
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
      {noticeOpen && release && (
        <UpdateNotice
          release={release}
          onClose={dismissNotice}
          // Taking the tour counts as having seen the release, so the notice
          // does not reappear behind it or on the next visit.
          onShowTour={hasTour ? () => { dismissNotice(); startTour(); } : null}
        />
      )}

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
          <div className="lander-tile-sub">JSON, TXT, DOCX</div>
        </button>
        <button className="lander-tile" onClick={onImportPaste}>
          <div className="lander-tile-icon">⎘</div>
          <div className="lander-tile-title">Import Paste</div>
          <div className="lander-tile-sub">Paste entries from clipboard</div>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx,.json"
        style={{ display: 'none' }}
        onChange={onImportFileChosen}
      />
      {importError && <div className="lander-import-error">{importError}</div>}

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
        <h2 className="lander-section-title">
          What&apos;s new
          {/* Only offered when this release has something to say about the
              screen you are on. 0.10.0 changed nothing on a desktop, so a
              desktop visitor gets no button rather than a tour that says so. */}
          {hasTour && (
            <button
              type="button"
              className="lander-tour-btn"
              onClick={startTour}
            >
              Take the tour
            </button>
          )}
        </h2>
        <div className="lander-changelog">
          <MarkdownView source={changelogRaw} />
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
          <li>To import an existing lorebook, use the Import / Export tab and drop in a <code>.json</code>, <code>.txt</code>, or <code>.docx</code> file.</li>
          <li>Use <kbd>{displayChord('new_entry')}</kbd> to add a new entry, <kbd>{displayChord('undo')}</kbd> to undo, <kbd>{displayChord('redo')}</kbd> to redo, and <kbd>Esc</kbd> to exit bulk-select mode. Press <kbd>?</kbd> anytime for the full shortcut list.</li>
        </ol>

        <h3 className="lander-subsection-title">Tips</h3>
        <ul className="lander-tips">
          <li>Hover over buttons and controls for help hints.</li>
          <li>Double-click an entry header to expand or collapse it.</li>
          <li>Paste a comma-separated list into the trigger field to add multiple triggers at once.</li>
          <li>Drag the <strong>⠿</strong> handle on any entry to reorder it in the list.</li>
          <li>Shift+scroll on the type selector inside an expanded entry to cycle through entry types.</li>
          <li>Turn on Entry Checkpoints in Settings to save and restore per-entry checkpoints.</li>
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

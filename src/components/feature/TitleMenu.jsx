// The lorebook title dropdown — two columns under the window title.
//
// Left column lists every saved lorebook (switch, delete, create). Right column
// carries import and export. Together they replace the Lorebooks and
// Import / Export menu tabs, putting both one click from the title rather than
// two clicks into a side panel.
//
// Portaled to document.body because `.floating-window` sets `overflow: hidden`
// — a menu anchored inside the header would be clipped at the header's bottom
// edge. Same reason ScaleMenu and LorebookSwitchPopover portal.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLorebookSwitcher } from '../../hooks/use-lorebook-switcher.js';
import { useLorebook }         from '../../hooks/use-lorebook.js';
import { useEntries }          from '../../hooks/use-entries.js';
import { useExport }           from '../../hooks/use-export.js';
import { useUi }               from '../../hooks/use-ui.js';
import { useDismissLayer }     from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY }    from '../../services/dismiss-stack.js';
import { DUPE_FLASH_MS }       from '../../constants/limits.js';
import {
  TITLE_MENU_WIDTH_PX,
  TITLE_MENU_STACK_BELOW_PX,
  TITLE_MENU_MAX_HEIGHT_PX,
  TITLE_MENU_GAP_PX,
  TITLE_MENU_EDGE_PAD_PX,
} from '../../constants/title-menu.js';

// Alphabetical, not recency-ordered. The stored index promotes the active book
// to the front on every switch (`promoteInIndex`), so a recency-ordered menu
// would reshuffle itself under the cursor the moment you used it — you'd never
// find the same book in the same place twice.
function byName(a, b) {
  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
}

// Open/close orchestration (hover, pin, outside click, resize) lives in
// WindowHeader alongside the trigger, the same way StatusFooter owns it for the
// sizing menu. This component only renders and reports that it wants to close.
export function TitleMenu({ anchorRect, onClose, onMouseEnter, onMouseLeave }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  const { items, createLorebook, switchLorebook, deleteLorebook } = useLorebookSwitcher();
  const { activeLorebook } = useLorebook();
  const { entries }        = useEntries();
  const setActiveMenuPanel = useUi((s) => s.setActiveMenuPanel);
  const {
    exportJson, exportTxt, exportDocx, copyJsonToClipboard,
    downloadJsonTemplate, downloadTxtTemplate, downloadDocxTemplate,
    defaultExportFilename, resolveExportFilename,
  } = useExport();

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const flashTimer = useRef(null);

  const defaultName = defaultExportFilename(activeLorebook?.name);
  const [filename, setFilename] = useState(defaultName);
  useEffect(() => { setFilename(defaultExportFilename(activeLorebook?.name)); },
    [activeLorebook?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  useDismissLayer('title-menu', true, DISMISS_PRIORITY.popover, onClose);

  // Position against the anchor once the menu has been measured. useLayoutEffect
  // so the first painted frame is already in place — positioning in useEffect
  // shows one frame at the top-left corner before it snaps.
  useLayoutEffect(() => {
    if (!anchorRect || !menuRef.current) return;
    const box = menuRef.current.getBoundingClientRect();
    const pad = TITLE_MENU_EDGE_PAD_PX;

    let left = anchorRect.left + anchorRect.width / 2 - box.width / 2;
    left = Math.max(pad, Math.min(left, window.innerWidth - box.width - pad));

    const top = anchorRect.bottom + TITLE_MENU_GAP_PX;
    // Height is capped by the constant and again by whatever room is actually
    // left below the anchor, so the menu can't run off the bottom of a short
    // viewport.
    const maxHeight = Math.min(
      TITLE_MENU_MAX_HEIGHT_PX,
      window.innerHeight - top - pad,
    );
    setPos({ left, top, maxHeight });
  }, [anchorRect]);

  const width = Math.min(TITLE_MENU_WIDTH_PX, window.innerWidth - TITLE_MENU_EDGE_PAD_PX * 2);
  const stacked = width < TITLE_MENU_STACK_BELOW_PX;

  const sorted = [...items].sort(byName);
  const confirmDeleteName = confirmDeleteId
    ? (items.find((i) => i.id === confirmDeleteId)?.name || '(unnamed)')
    : '';

  function pick(id) {
    switchLorebook(id);
    onClose();
  }

  function addLorebook() {
    createLorebook();
    onClose();
  }

  function openImportPanel() {
    setActiveMenuPanel('import-export');
    onClose();
  }

  async function copyJson() {
    try {
      await copyJsonToClipboard(activeLorebook);
      setCopiedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setCopiedFlash(false), DUPE_FLASH_MS);
    } catch {
      // Clipboard denied or unavailable — the download buttons still work.
    }
  }

  function download(fn, ext) {
    fn(activeLorebook, `${resolveExportFilename(filename, activeLorebook?.name)}.${ext}`);
  }

  return createPortal(
    <div
      ref={menuRef}
      className={`title-menu${stacked ? ' title-menu--stacked' : ''}`}
      role="dialog"
      aria-label="Lorebooks and import / export"
      style={{
        position: 'fixed',
        width,
        visibility: pos ? 'visible' : 'hidden',
        left: pos?.left ?? 0,
        top:  pos?.top ?? 0,
        maxHeight: pos?.maxHeight ?? TITLE_MENU_MAX_HEIGHT_PX,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Left: lorebooks ── */}
      <div className="tm-col tm-col--books">
        <div className="tm-col-head">
          Lorebooks <span className="tm-col-head-count">· {items.length}</span>
        </div>
        <div className="tm-col-body">
          {sorted.map((item) => (
            <div key={item.id} className="tm-book-wrap">
              <button
                type="button"
                className={`tm-book${item.isActive ? ' tm-book--active' : ''}`}
                onClick={() => pick(item.id)}
                title={item.isActive ? 'Current lorebook' : `Switch to "${item.name || '(unnamed)'}"`}
              >
                <span className="tm-book-name">{item.name || '(unnamed)'}</span>
                {item.relativeTime && <span className="tm-book-time">{item.relativeTime}</span>}
                <span
                  className="tm-book-del"
                  role="button"
                  tabIndex={-1}
                  aria-label={`Delete "${item.name || '(unnamed)'}"`}
                  title="Delete this lorebook"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                >
                  ×
                </span>
              </button>
              {confirmDeleteId === item.id && (
                <div className="tm-confirm">
                  <span className="tm-confirm-label">
                    Delete &ldquo;{confirmDeleteName}&rdquo;?
                  </span>
                  <div className="tm-confirm-actions">
                    <button
                      type="button"
                      className="tm-confirm-btn tm-confirm-btn--danger"
                      onClick={() => { deleteLorebook(confirmDeleteId); setConfirmDeleteId(null); }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="tm-confirm-btn"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="tm-new" onClick={addLorebook}>
          + New lorebook
        </button>
      </div>

      {/* ── Right: import / export ── */}
      <div className="tm-col tm-col--io">
        <div className="tm-col-head">Import / Export</div>
        <div className="tm-col-body">
          <div className="tm-section">
            <div className="tm-section-label">Import</div>
            <button type="button" className="tm-drop" onClick={openImportPanel}>
              Import a file…
              <span className="tm-drop-hint">TXT · DOCX · ODT · JSON</span>
            </button>
          </div>

          <div className="tm-divider" />

          <div className="tm-section">
            <div className="tm-section-label">
              Export
              <span className="tm-section-note">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <div className="tm-filename-row">
              <label htmlFor="tm-filename">File</label>
              <input
                id="tm-filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder={defaultName}
                spellCheck={false}
                title="Download filename (without extension) — letters, numbers, underscore, and hyphen only"
              />
            </div>
            <div className="tm-btn-row">
              <button type="button" className="tm-btn" onClick={() => download(exportJson, 'json')}>⬇ JSON</button>
              <button type="button" className="tm-btn" onClick={() => download(exportTxt, 'txt')}>⬇ TXT</button>
              <button type="button" className="tm-btn" onClick={() => download(exportDocx, 'docx')}>⬇ DOCX</button>
              <button type="button" className="tm-btn tm-btn--outline" onClick={copyJson}>
                {copiedFlash ? '✓ Copied' : '⎘ Copy'}
              </button>
            </div>
          </div>

          <div className="tm-divider" />

          <div className="tm-section">
            <div className="tm-section-label">Templates</div>
            <div className="tm-btn-row">
              <button type="button" className="tm-btn tm-btn--outline" onClick={downloadJsonTemplate}>⬇ JSON</button>
              <button type="button" className="tm-btn tm-btn--outline" onClick={downloadTxtTemplate}>⬇ TXT</button>
              <button type="button" className="tm-btn tm-btn--outline" onClick={downloadDocxTemplate}>⬇ DOCX</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

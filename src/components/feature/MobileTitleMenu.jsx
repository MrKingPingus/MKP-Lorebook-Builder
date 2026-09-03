// The mobile title menu — the navigation spine phone users did not have.
//
// Before this, a phone had **zero routes** to the Lorebooks destination with
// the default menus: the header is a gear that goes straight to Settings, and
// the title field, the pull tab and the ☰ dropdown are all desktop-or-legacy
// only. So creating, renaming or deleting any book other than the active one
// was unreachable, pairing a reference was unreachable (that is #123), and
// there was no way back to the lander short of reloading the page.
//
// It mirrors the desktop TitleMenu deliberately — same destinations, same
// route, opened off the lorebook name — because the two surfaces are already
// far enough apart. What it does not mirror is the geometry: desktop puts
// Lorebooks beside Import/Export in two columns, and 390px has no room for
// two of anything. The same two destinations become two tabs.
//
// Import/Export earns its tab even though the hotbar can reach both: **the
// hotbar is user-configurable**, so nothing permanently lives there, and a
// user who re-pins those two slots would otherwise have no route to import on
// a phone at all.
import { useState, useRef, useEffect } from 'react';
import { createPortal }          from 'react-dom';
import { useUi }                 from '../../hooks/use-ui.js';
import { useSettings }           from '../../hooks/use-settings.js';
import { useLorebook }           from '../../hooks/use-lorebook.js';
import { useEntries }            from '../../hooks/use-entries.js';
import { useExport }             from '../../hooks/use-export.js';
import { useImportFlow }         from '../../hooks/use-import-flow.js';
import { useSortedLorebooks }    from '../../hooks/use-sorted-lorebooks.js';
import { useReferenceLorebook }  from '../../hooks/use-reference-lorebook.js';
import { useReferenceChooser }   from '../../hooks/use-reference-chooser.js';
import { useDismissLayer }       from '../../hooks/use-dismiss-layer.js';
import { useHostMode }           from '../../hooks/use-host.js';
import { ImportFlow }            from './ImportFlow.jsx';
import { DISMISS_PRIORITY }      from '../../services/dismiss-stack.js';
import { DUPE_FLASH_MS }         from '../../constants/limits.js';
import { LOREBOOK_SORT_OPTIONS } from '../../constants/sort-modes.js';

const TABS = [
  { id: 'lorebooks',     label: 'Lorebooks' },
  { id: 'import-export', label: 'Import / Export' },
];

export function MobileTitleMenu() {
  const open      = useUi((s) => s.mobileTitleMenuOpen);
  const storedTab = useUi((s) => s.mobileTitleMenuTab);
  const setTab    = useUi((s) => s.setMobileTitleMenuTab);
  const close     = useUi((s) => s.closeMobileTitleMenu);
  // Host mode: CharSnap owns which book is open (and its name), so the
  // Lorebooks tab — switch, rename, delete, new — does not exist here.
  const hostMode  = useHostMode();
  const tabs      = hostMode ? TABS.filter((t) => t.id !== 'lorebooks') : TABS;
  const tab       = hostMode ? 'import-export' : storedTab;

  const { lorebookSort, setLorebookSort } = useSettings();
  const { sorted, items, createLorebook, switchLorebook, deleteLorebook, renameLorebookById } =
    useSortedLorebooks({ mode: lorebookSort, open });
  const { activeLorebook }  = useLorebook();
  const { entries }         = useEntries();
  const { referenceLorebook } = useReferenceLorebook();
  const { openChooser: openReferenceChooser } = useReferenceChooser();
  const { setReferenceLorebookId } = useReferenceLorebook();

  const flow = useImportFlow({ onDone: close });
  const {
    exportJson, exportTxt, exportDocx, copyJsonToClipboard,
    downloadJsonTemplate, downloadTxtTemplate, downloadDocxTemplate,
    defaultExportFilename, resolveExportFilename,
  } = useExport();

  // Per-row menu. One id at a time — two open ⋯ menus on a 390px column is
  // just an overlap.
  const [rowMenuId,      setRowMenuId]      = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingId,      setEditingId]      = useState(null);
  const [editingName,    setEditingName]    = useState('');
  const editInputRef = useRef(null);

  const [copiedFlash, setCopiedFlash] = useState(false);
  const flashTimer = useRef(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const defaultName = defaultExportFilename(activeLorebook?.name);
  const [filename, setFilename] = useState(defaultName);
  useEffect(() => { setFilename(defaultExportFilename(activeLorebook?.name)); },
    [activeLorebook?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Closing the menu drops every transient row state with it, so reopening
  // never shows a half-finished rename or a delete confirmation the user
  // walked away from.
  useEffect(() => {
    if (open) return;
    setRowMenuId(null);
    setConfirmDeleteId(null);
    setEditingId(null);
  }, [open]);

  useDismissLayer('mobile-title-menu', open, DISMISS_PRIORITY.popover, close);

  if (!open) return null;

  function pick(id) {
    switchLorebook(id);
    close();
  }

  function addLorebook() {
    createLorebook();
    close();
  }

  function pairAsReference(id) {
    setReferenceLorebookId(id);
    setRowMenuId(null);
  }

  function startRename(item) {
    setRowMenuId(null);
    setEditingId(item.id);
    setEditingName(item.name || '');
  }

  function commitRename() {
    if (editingId) renameLorebookById(editingId, editingName);
    setEditingId(null);
  }

  function onEditKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commitRename(); }
    if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); }
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

  const confirmDeleteName = confirmDeleteId
    ? (items.find((i) => i.id === confirmDeleteId)?.name || '(unnamed)')
    : '';

  return createPortal(
    <div className="mtm" role="dialog" aria-label="Lorebooks and import / export">
      <div className="mtm-head">
        <div className="mtm-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`mtm-tab${tab === t.id ? ' mtm-tab--on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mtm-close touch-floor-box"
          onClick={close}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="mtm-body">
        {tab === 'lorebooks' ? (
          <>
            {items.length > 1 && (
              <div className="mtm-sort" role="group" aria-label="Sort lorebooks">
                {LOREBOOK_SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`tm-sort-btn${lorebookSort === opt.id ? ' tm-sort-btn--on' : ''}`}
                    onClick={() => setLorebookSort(opt.id)}
                    aria-pressed={lorebookSort === opt.id}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {sorted.map((item) => {
              const isReference = item.id === referenceLorebook?.id;
              return (
                <div key={item.id} className="mtm-row-wrap">
                  <div className={`mtm-row${item.isActive ? ' mtm-row--active' : ''}`}>
                    {editingId === item.id ? (
                      <input
                        ref={editInputRef}
                        className="mtm-rename-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={onEditKeyDown}
                        spellCheck={false}
                      />
                    ) : (
                      <button
                        type="button"
                        className="mtm-row-main"
                        onClick={() => pick(item.id)}
                        disabled={item.isActive}
                      >
                        <span className="mtm-row-name">{item.name || '(unnamed)'}</span>
                        {isReference && <span className="mtm-row-badge">REF</span>}
                        {item.relativeTime && (
                          <span className="mtm-row-time">{item.relativeTime}</span>
                        )}
                      </button>
                    )}
                    {editingId !== item.id && (
                      <button
                        type="button"
                        className="mtm-row-menu-btn touch-floor-box"
                        onClick={() => setRowMenuId(rowMenuId === item.id ? null : item.id)}
                        aria-label={`Actions for "${item.name || '(unnamed)'}"`}
                        aria-expanded={rowMenuId === item.id}
                      >
                        ⋯
                      </button>
                    )}
                  </div>

                  {/* Every action a word. The first draft of this menu put a
                      bare ⇄ on the row instead, and it failed on the first
                      person who saw it — see docs/plan.md decision 10. */}
                  {rowMenuId === item.id && (
                    <div className="mtm-row-menu">
                      {!item.isActive && !isReference && (
                        <button
                          type="button"
                          className="mtm-row-menu-item"
                          onClick={() => pairAsReference(item.id)}
                        >
                          Pair as reference
                        </button>
                      )}
                      {isReference && (
                        <button
                          type="button"
                          className="mtm-row-menu-item"
                          onClick={() => { setReferenceLorebookId(null); setRowMenuId(null); }}
                        >
                          Unpair as reference
                        </button>
                      )}
                      <button
                        type="button"
                        className="mtm-row-menu-item"
                        onClick={() => startRename(item)}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="mtm-row-menu-item mtm-row-menu-item--danger"
                        onClick={() => { setRowMenuId(null); setConfirmDeleteId(item.id); }}
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  {confirmDeleteId === item.id && (
                    <div className="mtm-confirm">
                      <span className="mtm-confirm-label">
                        Delete &ldquo;{confirmDeleteName}&rdquo;?
                      </span>
                      <div className="mtm-confirm-actions">
                        <button
                          type="button"
                          className="mtm-confirm-btn mtm-confirm-btn--danger"
                          onClick={() => { deleteLorebook(confirmDeleteId); setConfirmDeleteId(null); }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="mtm-confirm-btn"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="mtm-section">
              <div className="mtm-section-label">Import</div>
              <ImportFlow flow={flow} />
            </div>

            <div className="mtm-divider" />

            <div className="mtm-section">
              <div className="mtm-section-label">
                Export
                <span className="mtm-section-note">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>
              <div className="mtm-filename-row">
                <label htmlFor="mtm-filename">File</label>
                <input
                  id="mtm-filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder={defaultName}
                  spellCheck={false}
                />
              </div>
              <div className="mtm-btn-row">
                <button type="button" className="mtm-btn" onClick={() => download(exportJson, 'json')}>⬇ JSON</button>
                <button type="button" className="mtm-btn" onClick={() => download(exportTxt, 'txt')}>⬇ TXT</button>
                <button type="button" className="mtm-btn" onClick={() => download(exportDocx, 'docx')}>⬇ DOCX</button>
                <button type="button" className="mtm-btn mtm-btn--outline" onClick={copyJson}>
                  {copiedFlash ? '✓ Copied' : '⎘ Copy'}
                </button>
              </div>
            </div>

            <div className="mtm-divider" />

            <div className="mtm-section">
              <div className="mtm-section-label">Templates</div>
              <div className="mtm-btn-row">
                <button type="button" className="mtm-btn mtm-btn--outline" onClick={downloadJsonTemplate}>⬇ JSON</button>
                <button type="button" className="mtm-btn mtm-btn--outline" onClick={downloadTxtTemplate}>⬇ TXT</button>
                <button type="button" className="mtm-btn mtm-btn--outline" onClick={downloadDocxTemplate}>⬇ DOCX</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer is the Lorebooks tab's own, so it doesn't hover over the import
          flow claiming to act on it. ＋ New takes the accent so it reads as the
          same primary action as the FAB. */}
      {tab === 'lorebooks' && (
        <div className="mtm-foot">
          <button
            type="button"
            className="mtm-foot-btn mtm-foot-btn--ref"
            onClick={() => { close(); openReferenceChooser(); }}
          >
            ⇄ Reference
          </button>
          <button
            type="button"
            className="mtm-foot-btn mtm-foot-btn--new"
            onClick={addLorebook}
          >
            ＋ New
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

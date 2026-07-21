// Floating export menu anchored above the hotbar button (slot or FAB-menu item)
// that opened it. Pick a format + filename and export the active book in one step.
// Open/close state and the anchor rect live in ui-store (exportMenuAnchor).
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUi }       from '../../hooks/use-ui.js';
import { useLorebook } from '../../hooks/use-lorebook.js';
import { useExport }   from '../../hooks/use-export.js';

const MENU_WIDTH = 236;

export function ExportMenu() {
  const anchor          = useUi((s) => s.exportMenuAnchor);
  const closeExportMenu = useUi((s) => s.closeExportMenu);
  const { activeLorebook } = useLorebook();
  const { exportJson, exportTxt, exportDocx, copyJsonToClipboard } = useExport();
  const menuRef = useRef(null);

  const defaultName = (activeLorebook?.name || 'lorebook').replace(/[^a-z0-9_-]/gi, '_');
  const [filename, setFilename] = useState(defaultName);

  // Reset the filename to the active book's name each time the menu opens.
  useEffect(() => {
    if (anchor) setFilename(defaultName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // Close on outside pointerdown / Escape while open.
  useEffect(() => {
    if (!anchor) return undefined;
    function onDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeExportMenu();
    }
    // Consume Escape before the window dispatcher so it closes this menu only.
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); closeExportMenu(); } }
    const id = setTimeout(() => document.addEventListener('pointerdown', onDown), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor, closeExportMenu]);

  if (!anchor || !activeLorebook) return null;

  // Sanitize at export time; fall back to the book's safe name when blank.
  function resolveName() {
    const cleaned = filename.replace(/[^a-z0-9_-]/gi, '_').replace(/^_+|_+$/g, '');
    return cleaned || defaultName || 'lorebook';
  }

  function download(fn, ext) {
    fn(activeLorebook, `${resolveName()}.${ext}`);
    closeExportMenu();
  }

  async function copy() {
    try { await copyJsonToClipboard(activeLorebook); } catch { /* clipboard denied — no-op */ }
    closeExportMenu();
  }

  // Grow upward from just above the anchor; clamp to the viewport horizontally.
  const style = {
    position: 'fixed',
    bottom: Math.max(8, window.innerHeight - anchor.top + 8),
    left:   Math.max(8, Math.min(anchor.left, window.innerWidth - MENU_WIDTH - 8)),
    width:  MENU_WIDTH,
  };

  return createPortal(
    <div
      ref={menuRef}
      className="export-menu"
      style={style}
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="export-menu-header">
        <span className="export-menu-title">Export book</span>
        <button className="export-menu-close" onClick={closeExportMenu} title="Close">×</button>
      </div>
      <label className="export-menu-field-label" htmlFor="export-menu-filename">Filename</label>
      <input
        id="export-menu-filename"
        className="export-menu-input"
        value={filename}
        onChange={(e) => setFilename(e.target.value)}
        placeholder={defaultName}
        spellCheck={false}
        title="Download filename (without extension) — letters, numbers, underscore, and hyphen only"
      />
      <div className="export-menu-formats">
        <button className="export-menu-btn" onClick={() => download(exportJson, 'json')}>⬇ JSON</button>
        <button className="export-menu-btn" onClick={() => download(exportTxt, 'txt')}>⬇ TXT</button>
        <button className="export-menu-btn" onClick={() => download(exportDocx, 'docx')}>⬇ DOCX</button>
      </div>
      <button className="export-menu-btn export-menu-btn--outline" onClick={copy}>⎘ Copy JSON</button>
    </div>,
    document.body
  );
}

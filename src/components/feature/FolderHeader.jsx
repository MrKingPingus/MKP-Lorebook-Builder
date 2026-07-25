// Header row for one folder in the entry list: collapse-cycle glyph, colour
// swatch (opens a picker), inline-editable name, entry count, and delete.
import { useState, useRef, useEffect } from 'react';
import { useFolders }      from '../../hooks/use-folders.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import {
  FOLDER_COLORS,
  COLLAPSE_GLYPHS,
  COLLAPSE_STATES,
  NEW_FOLDER_NAME,
} from '../../constants/folders.js';

export function FolderHeader({ folder, count }) {
  const { renameFolder, setFolderColor, deleteFolder, cycleCollapse } = useFolders();
  const [draftName, setDraftName] = useState(folder.name);
  const [editing, setEditing]     = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef(null);
  const rootRef  = useRef(null);

  // Adopt external name changes (undo, or another surface renaming the folder)
  // whenever this header isn't the thing doing the editing.
  useEffect(() => {
    if (!editing) setDraftName(folder.name);
  }, [folder.name, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useDismissLayer(`folder-color-${folder.id}`, pickerOpen, DISMISS_PRIORITY.popover, () => setPickerOpen(false));

  useEffect(() => {
    if (!pickerOpen) return undefined;
    function onMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pickerOpen]);

  // Rename commits on blur / Enter — one history step per edit session rather
  // than one per keystroke. Escape reverts to the stored name.
  function commitName() {
    setEditing(false);
    const next = draftName.trim();
    if (!next) { setDraftName(folder.name); return; }
    renameFolder(folder.id, next);
  }

  function onNameKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitName(); }
    if (e.key === 'Escape') { e.preventDefault(); setDraftName(folder.name); setEditing(false); }
  }

  const isTucked = folder.collapseState === COLLAPSE_STATES.TUCKED;
  const glyph    = COLLAPSE_GLYPHS[folder.collapseState] ?? COLLAPSE_GLYPHS[COLLAPSE_STATES.FULL];

  return (
    <div
      className={`folder-header${isTucked ? ' folder-header--tucked' : ''}`}
      style={{ '--folder-color': folder.color }}
      ref={rootRef}
    >
      <button
        className="folder-collapse-btn"
        onClick={() => cycleCollapse(folder.id)}
        title={isTucked ? 'Show the entries in this folder' : 'Hide the entries in this folder'}
        aria-expanded={!isTucked}
        type="button"
      >
        {glyph}
      </button>

      <button
        className="folder-swatch"
        onClick={() => setPickerOpen((o) => !o)}
        title="Change folder colour"
        aria-label={`Change colour of folder ${folder.name || NEW_FOLDER_NAME}`}
        type="button"
      />

      {editing ? (
        <input
          ref={inputRef}
          className="folder-name-input"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={commitName}
          onKeyDown={onNameKeyDown}
        />
      ) : (
        <button
          className="folder-name"
          onClick={() => setEditing(true)}
          title="Rename folder"
          type="button"
        >
          {folder.name || NEW_FOLDER_NAME}
        </button>
      )}

      <span className="folder-count" title={`${count} entr${count === 1 ? 'y' : 'ies'} in this folder`}>
        {count}
      </span>

      <button
        className="folder-delete-btn"
        onClick={() => deleteFolder(folder.id)}
        title="Delete this folder — the entries inside move back to the top level"
        type="button"
      >
        ×
      </button>

      {pickerOpen && (
        <div className="folder-color-picker">
          {FOLDER_COLORS.map((swatch) => (
            <button
              key={swatch.id}
              className={`folder-color-option${folder.color === swatch.color ? ' folder-color-option--active' : ''}`}
              style={{ background: swatch.color }}
              onClick={() => { setFolderColor(folder.id, swatch.color); setPickerOpen(false); }}
              title={swatch.label}
              aria-label={swatch.label}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}

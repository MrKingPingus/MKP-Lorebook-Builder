// Header row for one folder in the entry list: collapse-cycle glyph, colour
// swatch (opens a picker), inline-editable name, entry count, and delete.
import { useState, useRef, useEffect } from 'react';
import { useFolders }      from '../../hooks/use-folders.js';
import { useUi }           from '../../hooks/use-ui.js';
import { useDismissLayer } from '../../hooks/use-dismiss-layer.js';
import { DISMISS_PRIORITY } from '../../services/dismiss-stack.js';
import {
  FOLDER_COLORS,
  COLLAPSE_GLYPHS,
  COLLAPSE_LABELS,
  COLLAPSE_STATES,
  NEW_FOLDER_NAME,
  TOP_LEVEL_LABEL,
  MAX_FOLDER_DEPTH,
} from '../../constants/folders.js';
import { nextCollapseState } from '../../services/folder-tree.js';

export function FolderHeader({ folder, count, effectiveState }) {
  const { renameFolder, setFolderColor, deleteFolder, cycleCollapse, nestFolder, parentOptions } = useFolders();
  const [draftName, setDraftName] = useState(folder.name);
  const [editing, setEditing]     = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nestOpen, setNestOpen]     = useState(false);
  const inputRef = useRef(null);
  const rootRef  = useRef(null);
  const pendingFocusFolderId    = useUi((s) => s.pendingFocusFolderId);
  const setPendingFocusFolderId = useUi((s) => s.setPendingFocusFolderId);

  // A folder that was just created opens straight into its rename input — it's
  // always born as "New Folder", so naming it is the guaranteed next step.
  useEffect(() => {
    if (pendingFocusFolderId !== folder.id) return;
    setEditing(true);
    setPendingFocusFolderId(null);
  }, [pendingFocusFolderId, folder.id, setPendingFocusFolderId]);

  // Adopt external name changes (undo, or another surface renaming the folder)
  // whenever this header isn't the thing doing the editing.
  useEffect(() => {
    if (!editing) setDraftName(folder.name);
  }, [folder.name, editing]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  useDismissLayer(`folder-color-${folder.id}`, pickerOpen, DISMISS_PRIORITY.popover, () => setPickerOpen(false));
  useDismissLayer(`folder-nest-${folder.id}`, nestOpen, DISMISS_PRIORITY.popover, () => setNestOpen(false));

  useEffect(() => {
    if (!pickerOpen && !nestOpen) return undefined;
    function onMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setPickerOpen(false);
        setNestOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [pickerOpen, nestOpen]);

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

  // A folder renders at the more collapsed of its own state and whatever it
  // inherits; the header reflects what's actually on screen, while the cycle
  // button still advances the folder's OWN state.
  const shownState = effectiveState ?? folder.collapseState;
  const isTucked   = shownState === COLLAPSE_STATES.TUCKED;
  const inherited  = shownState !== folder.collapseState;
  const glyph      = COLLAPSE_GLYPHS[shownState] ?? COLLAPSE_GLYPHS[COLLAPSE_STATES.FULL];
  const nextState  = nextCollapseState(folder.collapseState);
  const parents    = nestOpen ? parentOptions(folder.id) : [];

  return (
    <div
      className={`folder-header${isTucked ? ' folder-header--tucked' : ''}`}
      style={{ '--folder-color': folder.color }}
      ref={rootRef}
    >
      <button
        className="folder-collapse-btn"
        onClick={() => cycleCollapse(folder.id)}
        title={inherited
          ? `${COLLAPSE_LABELS[shownState]} (inherited from a parent folder) — click for: ${COLLAPSE_LABELS[nextState].toLowerCase()}`
          : `${COLLAPSE_LABELS[shownState] ?? COLLAPSE_LABELS[COLLAPSE_STATES.FULL]} — click for: ${COLLAPSE_LABELS[nextState].toLowerCase()}`}
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
        className="folder-nest-btn"
        onClick={() => { setNestOpen((o) => !o); setPickerOpen(false); }}
        title="Move this folder inside another folder"
        aria-label={`Move folder ${folder.name || NEW_FOLDER_NAME} into another folder`}
        type="button"
      >
        ⇥
      </button>

      <button
        className="folder-delete-btn"
        onClick={() => deleteFolder(folder.id)}
        title="Delete this folder — the entries inside move back to the top level"
        type="button"
      >
        ×
      </button>

      {nestOpen && (
        <div className="folder-nest-menu">
          <button
            className={`folder-nest-item${!folder.parentId ? ' folder-nest-item--active' : ''}`}
            onClick={() => { nestFolder(folder.id, null); setNestOpen(false); }}
            type="button"
          >
            {TOP_LEVEL_LABEL}
          </button>
          {parents.map((f) => (
            <button
              key={f.id}
              className={`folder-nest-item${f.id === folder.parentId ? ' folder-nest-item--active' : ''}`}
              onClick={() => { nestFolder(folder.id, f.id); setNestOpen(false); }}
              type="button"
            >
              <span className="folder-nest-dot" style={{ background: f.color }} />
              {f.name || NEW_FOLDER_NAME}
            </button>
          ))}
          {parents.length === 0 && (
            <div className="folder-nest-empty">No folder can hold this one — the nesting limit is {MAX_FOLDER_DEPTH} levels.</div>
          )}
        </div>
      )}

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

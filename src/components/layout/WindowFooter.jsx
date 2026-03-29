// Window footer — Clear All, + FAB, Undo, Redo, Import Entries
import { useEntries }  from '../../hooks/use-entries.js';
import { useUndoRedo } from '../../hooks/use-undo-redo.js';
import { useUi }       from '../../hooks/use-ui.js';

export function WindowFooter() {
  const { addEntry, clearAllEntries } = useEntries();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const setShowAppendImport = useUi((s) => s.setShowAppendImport);

  function handleClearAll() {
    if (window.confirm('Clear all entries? This can be undone.')) {
      clearAllEntries();
    }
  }

  return (
    <div className="window-footer">
      <div className="footer-left">
        <button className="footer-btn" onClick={handleClearAll}>
          Clear All
        </button>
        <button
          className="footer-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
      </div>

      <button
        className="footer-fab"
        onClick={addEntry}
        title="Add entry (Alt+N)"
      >
        +
      </button>

      <div className="footer-right">
        <button
          className="footer-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪ Redo
        </button>
        <button
          className="footer-btn"
          onClick={() => setShowAppendImport(true)}
          title="Copy/Paste additional entries to the current lorebook!"
        >
          ↓ Import Entries
        </button>
      </div>
    </div>
  );
}

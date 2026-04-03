// Bind global keydown handlers for Alt+<hotkey> (new entry), Ctrl+Z (undo), Ctrl+Y (redo)
import { useEffect } from 'react';

export function useKeyboardShortcuts({ onNewEntry, onUndo, onRedo, hotkey = 'n', undoHotkey = 'z', redoHotkey = 'y' }) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Alt+<hotkey> — new entry (hotkey is a single lowercase letter)
      if (e.altKey && e.key === hotkey) {
        e.preventDefault();
        onNewEntry?.();
        return;
      }
      // Ctrl+<redoHotkey> — redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === redoHotkey) {
        e.preventDefault();
        onRedo?.();
        return;
      }
      // Ctrl+<undoHotkey> — undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === undoHotkey) {
        e.preventDefault();
        onUndo?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewEntry, onUndo, onRedo, hotkey, undoHotkey, redoHotkey]);
}

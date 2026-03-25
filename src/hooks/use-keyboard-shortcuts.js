// Bind global keydown handlers for Alt+<hotkey> (new entry), Ctrl+Z (undo), Ctrl+Shift+Z (redo)
import { useEffect } from 'react';

export function useKeyboardShortcuts({ onNewEntry, onUndo, onRedo, hotkey = 'n' }) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Alt+<hotkey> — new entry (hotkey is a single lowercase letter)
      if (e.altKey && e.key === hotkey) {
        e.preventDefault();
        onNewEntry?.();
        return;
      }
      // Ctrl+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        onRedo?.();
        return;
      }
      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        onUndo?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewEntry, onUndo, onRedo, hotkey]);
}

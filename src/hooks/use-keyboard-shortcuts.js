// Bind global keydown handlers for Alt+N (new entry), Ctrl+Z (undo), Ctrl+Shift+Z (redo)
import { useEffect } from 'react';

export function useKeyboardShortcuts({ onNewEntry, onUndo, onRedo }) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Alt+N — new entry
      if (e.altKey && e.key === 'n') {
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
  }, [onNewEntry, onUndo, onRedo]);
}

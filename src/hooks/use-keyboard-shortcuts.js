// Bind global keydown handlers for Alt+<hotkey> (new entry), Ctrl+Z (undo), Ctrl+Y (redo)
import { useEffect } from 'react';

export function useKeyboardShortcuts({ onNewEntry, onUndo, onRedo, hotkey = 'n', undoHotkey = 'z', redoHotkey = 'y' }) {
  useEffect(() => {
    function isTextInputFocused() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || el.isContentEditable;
    }

    function handleKeyDown(e) {
      // Alt+<hotkey> — new entry (hotkey is a single lowercase letter)
      if (e.altKey && e.key === hotkey) {
        e.preventDefault();
        onNewEntry?.();
        return;
      }
      // Ctrl+<redoHotkey> — redo (skip when typing so browser redo works)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === redoHotkey) {
        if (isTextInputFocused()) return;
        e.preventDefault();
        onRedo?.();
        return;
      }
      // Ctrl+<undoHotkey> — undo (skip when typing so browser undo works)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === undoHotkey) {
        if (isTextInputFocused()) return;
        e.preventDefault();
        onUndo?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewEntry, onUndo, onRedo, hotkey, undoHotkey, redoHotkey]);
}

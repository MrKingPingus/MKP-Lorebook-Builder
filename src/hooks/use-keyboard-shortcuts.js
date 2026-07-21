// Global keydown dispatcher. Matches events against the resolved keybinding
// list and calls the supplied handler for the action's id. Escape is delegated
// to the dismiss stack (highest-priority active layer pops first). Replaces the
// old fixed if-cascade — new actions are added via the registry, not here.
import { useEffect } from 'react';
import { matchesChord } from '../services/keychord.js';
import { dismissTopLayer } from '../services/dismiss-stack.js';

function isTextInputFocused() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  return tag === 'input' || tag === 'textarea' || el.isContentEditable;
}

export function useKeyboardShortcuts({ bindings, handlers, isEnabled }) {
  useEffect(() => {
    function handleKeyDown(e) {
      // Escape — pop the top dismissable layer. Skipped while a text input is
      // focused so inline editors and modal inputs keep local Escape semantics.
      if (e.key === 'Escape') {
        if (isTextInputFocused()) return;
        if (dismissTopLayer()) e.preventDefault();
        return;
      }

      const inInput = isTextInputFocused();
      for (const b of bindings) {
        if (inInput && !b.allowInInput) continue;
        if (b.context && isEnabled && !isEnabled(b.context)) continue;
        const handler = handlers[b.id];
        if (!handler) continue; // unwired action — reserved default only
        if (b.chords.some((c) => matchesChord(e, c))) {
          e.preventDefault();
          handler(e);
          return;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bindings, handlers, isEnabled]);
}

// Phrase builder state: token sequence (chip | text), ordering, insert, commit, and cancel
import { useState } from 'react';

export function usePhraseBuilder(onCommit) {
  const [tokens, setTokens] = useState([]);
  const [active, setActive] = useState(false);

  function open() {
    setTokens([]);
    setActive(true);
  }

  function close() {
    setTokens([]);
    setActive(false);
  }

  function addChip(text) {
    setTokens((prev) => [...prev, { type: 'chip', text }]);
  }

  function insertText(idx, text) {
    if (!text.trim()) return;
    setTokens((prev) => {
      const next = [...prev];
      next.splice(idx, 0, { type: 'text', text: text.trim() });
      return next;
    });
  }

  function removeToken(idx) {
    setTokens((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveToken(fromIdx, toIdx) {
    setTokens((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  function commit() {
    if (tokens.length > 0) {
      onCommit(tokens.map((t) => t.text).join(' '));
    }
    close();
  }

  return { tokens, active, open, close, addChip, insertText, removeToken, moveToken, commit };
}

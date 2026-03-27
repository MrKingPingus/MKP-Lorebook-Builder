// Phrase builder state: selected suggestion words, ordering, commit to trigger, and cancel
import { useState } from 'react';

export function usePhraseBuilder(onCommit) {
  const [words, setWords] = useState([]);
  const [active, setActive] = useState(false);

  function open() {
    setWords([]);
    setActive(true);
  }

  function close() {
    setWords([]);
    setActive(false);
  }

  function addWord(word) {
    if (!words.includes(word)) {
      setWords((prev) => [...prev, word]);
    }
  }

  function removeWord(word) {
    setWords((prev) => prev.filter((w) => w !== word));
  }

  function moveWord(fromIdx, toIdx) {
    setWords((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  function editWord(idx, newWord) {
    setWords((prev) => prev.map((w, i) => (i === idx ? newWord : w)));
  }

  function commit() {
    if (words.length > 0) {
      onCommit(words.join(' '));
    }
    close();
  }

  return { words, active, open, close, addWord, removeWord, moveWord, editWord, commit };
}

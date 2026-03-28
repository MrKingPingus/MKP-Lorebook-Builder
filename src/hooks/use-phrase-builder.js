// Phrase builder state: collect words from suggestion chips, reorder via two-click swap, commit as trigger
import { useState } from 'react';

export function usePhraseBuilder(onCommit) {
  const [phraseMode, setPhraseMode]               = useState(false);
  const [phraseQueue, setPhraseQueue]             = useState([]);
  const [selectedPhraseIdx, setSelectedPhraseIdx] = useState(-1);

  function open() {
    setPhraseQueue([]);
    setSelectedPhraseIdx(-1);
    setPhraseMode(true);
  }

  function close() {
    setPhraseQueue([]);
    setSelectedPhraseIdx(-1);
    setPhraseMode(false);
  }

  function addWord(word) {
    if (phraseQueue.includes(word)) return;
    setPhraseQueue((prev) => [...prev, word]);
  }

  // Two-click swap: first click selects; second click on same pill deselects; on a different pill → swap
  function selectPill(idx) {
    if (selectedPhraseIdx === -1) {
      setSelectedPhraseIdx(idx);
    } else if (selectedPhraseIdx === idx) {
      setSelectedPhraseIdx(-1);
    } else {
      const next = [...phraseQueue];
      const tmp = next[selectedPhraseIdx];
      next[selectedPhraseIdx] = next[idx];
      next[idx] = tmp;
      setPhraseQueue(next);
      setSelectedPhraseIdx(-1);
    }
  }

  function removeWord(idx) {
    const newQueue = phraseQueue.filter((_, i) => i !== idx);
    setPhraseQueue(newQueue);
    setSelectedPhraseIdx(-1);
    if (newQueue.length === 0) setPhraseMode(false);
  }

  function commit() {
    if (phraseQueue.length === 0) return;
    onCommit(phraseQueue.join(' '));
    close();
  }

  return { phraseMode, phraseQueue, selectedPhraseIdx, open, close, addWord, selectPill, removeWord, commit };
}

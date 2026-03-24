// Fetch, rotate through, and add suggestion chips for a single entry via suggestion-engine
import { useState, useCallback } from 'react';
import { generateSuggestions } from '../services/suggestion-engine.js';

export function useSuggestions(entry, onAddTrigger) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    const generated = generateSuggestions(entry, entry.triggers ?? [], 12);
    setSuggestions(generated);
  }, [entry]);

  function toggle() {
    if (!open) refresh();
    setOpen((v) => !v);
  }

  function addSuggestion(word) {
    onAddTrigger(word);
    setSuggestions((prev) => prev.filter((s) => s !== word));
  }

  function reroll() {
    refresh();
  }

  return { suggestions, open, toggle, addSuggestion, reroll };
}

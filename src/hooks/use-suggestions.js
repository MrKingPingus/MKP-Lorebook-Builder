// Fetch, rotate through, and add suggestion chips for a single entry via suggestion-engine
import { useState, useCallback, useEffect } from 'react';
import { generateSuggestions }  from '../services/suggestion-engine.js';
import { useSettingsStore }     from '../state/settings-store.js';

export function useSuggestions(entry, onAddTrigger) {
  const hideSuggestionsByDefault = useSettingsStore((s) => s.hideSuggestionsByDefault);
  const [suggestions, setSuggestions] = useState([]);
  const initiallyOpen = !hideSuggestionsByDefault;
  const [open, setOpen] = useState(initiallyOpen);

  const refresh = useCallback(() => {
    const generated = generateSuggestions(entry, entry.triggers ?? [], 12);
    setSuggestions(generated);
  }, [entry]);

  // Populate suggestions on mount if tray starts open
  useEffect(() => {
    if (initiallyOpen) refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

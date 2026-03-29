// Fetch, rotate through, and add suggestion chips for a single entry via suggestion-engine
import { useState, useCallback, useEffect } from 'react';
import { generateSuggestions }  from '../services/suggestion-engine.js';
import { useSettingsStore }     from '../state/settings-store.js';
import { SUGGESTION_LIMIT }    from '../constants/limits.js';

export function useSuggestions(entry, onAddTrigger) {
  const hideSuggestionsByDefault = useSettingsStore((s) => s.hideSuggestionsByDefault);
  const [suggestions, setSuggestions] = useState([]);
  const initiallyOpen = !hideSuggestionsByDefault;
  const [open, setOpen] = useState(initiallyOpen);

  const refresh = useCallback(() => {
    const generated = generateSuggestions(entry, entry.triggers ?? [], SUGGESTION_LIMIT);
    setSuggestions(generated);
  }, [entry]);

  // Populate suggestions when tray is open or entry content changes
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

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

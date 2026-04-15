// Fetch, rotate through, and add suggestion chips for a single entry via suggestion-engine
import { useState, useCallback, useEffect, useRef } from 'react';
import { generateSuggestions, countRerollPages } from '../services/suggestion-engine.js';
import { useSettingsStore }     from '../state/settings-store.js';
import { SUGGESTION_LIMIT }    from '../constants/limits.js';

export function useSuggestions(entry, onAddTrigger) {
  const hideSuggestionsByDefault = useSettingsStore((s) => s.hideSuggestionsByDefault);
  const [suggestions, setSuggestions] = useState([]);
  const initiallyOpen = !hideSuggestionsByDefault;
  const [open, setOpen] = useState(initiallyOpen);
  // Reroll rotates through pages of the candidate pool; incremented per press, reset when the entry changes
  const pageRef = useRef(0);

  const refresh = useCallback(() => {
    const generated = generateSuggestions(entry, entry.triggers ?? [], SUGGESTION_LIMIT, pageRef.current);
    setSuggestions(generated);
  }, [entry]);

  // Reset page whenever the name or description changes so the first page reflects fresh content.
  // We intentionally don't reset on trigger changes — accepting a suggestion shouldn't
  // throw the user back to page 1 in the middle of a reroll session.
  useEffect(() => {
    pageRef.current = 0;
  }, [entry.name, entry.description]);

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
    const totalPages = countRerollPages(entry, entry.triggers ?? [], SUGGESTION_LIMIT);
    pageRef.current = (pageRef.current + 1) % Math.max(totalPages, 1);
    refresh();
  }

  return { suggestions, open, toggle, addSuggestion, reroll };
}

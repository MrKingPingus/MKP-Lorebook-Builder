// Find and replace field state, match count display, and dispatch to find-replace service
import { useState } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore } from '../state/history-store.js';
import { findReplace, countMatches } from '../services/find-replace.js';

export function useFindReplace(entries) {
  const [findText, setFindText]       = useState('');
  const [replaceText, setReplaceText] = useState('');

  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot        = useHistoryStore((s) => s.pushSnapshot);

  const matchCount = countMatches(entries, findText);

  function replaceAll() {
    if (!findText) return;
    pushSnapshot({ entries: [...entries] });
    const updated = findReplace(entries, findText, replaceText);
    updateActiveEntries(updated);
  }

  return { findText, setFindText, replaceText, setReplaceText, matchCount, replaceAll };
}

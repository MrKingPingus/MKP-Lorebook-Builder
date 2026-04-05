// Find and replace field state, scope selector, match count display, and dispatch to find-replace service
import { useState } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore } from '../state/history-store.js';
import { findReplace, countMatches } from '../services/find-replace.js';

const DEFAULT_SCOPE = { title: true, triggers: true, description: true };

export function useFindReplace(entries) {
  const [findText, setFindText]       = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scope, setScope]             = useState(DEFAULT_SCOPE);
  const [scopeOpen, setScopeOpen]     = useState(false);

  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot        = useHistoryStore((s) => s.pushSnapshot);

  const matchCount = countMatches(entries, findText, scope);

  function toggleScope(field) {
    if (field === 'all') {
      setScope(DEFAULT_SCOPE);
      return;
    }
    setScope((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      // If all three are now true, treat as "all"
      return next;
    });
  }

  // Whether "All" is effectively selected (all three fields on)
  const allSelected = scope.title && scope.triggers && scope.description;

  function replaceAll() {
    if (!findText) return;
    pushSnapshot({ entries: [...entries] });
    const updated = findReplace(entries, findText, replaceText, scope);
    updateActiveEntries(updated);
    setScopeOpen(false);
  }

  return {
    findText, setFindText,
    replaceText, setReplaceText,
    matchCount,
    replaceAll,
    scope, toggleScope, allSelected,
    scopeOpen, setScopeOpen,
  };
}

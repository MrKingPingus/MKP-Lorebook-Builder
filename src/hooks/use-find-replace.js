// Find and replace field state, scope selector, match count display, and dispatch to find-replace service
import { useState, useEffect } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore } from '../state/history-store.js';
import { findReplace, countMatches } from '../services/find-replace.js';

const DEFAULT_SCOPE = { title: true, triggers: true, description: true };

export function useFindReplace(entries) {
  const [findText, setFindText]       = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scope, setScope]             = useState(DEFAULT_SCOPE);
  const [scopeOpen, setScopeOpen]     = useState(false);

  const activeLorebookId = useLorebookStore((s) => s.activeLorebookId);
  const updateEntries    = useLorebookStore((s) => s.updateEntries);
  const pushSnapshot     = useHistoryStore((s) => s.pushSnapshot);

  // Reset find/replace fields when switching lorebooks so stale terms don't
  // appear to wipe results in the new book.
  useEffect(() => {
    setFindText('');
    setReplaceText('');
    setScope(DEFAULT_SCOPE);
    setScopeOpen(false);
  }, [activeLorebookId]);

  const matchCount = countMatches(entries, findText, scope);

  function toggleScope(field) {
    if (field === 'all') {
      setScope(DEFAULT_SCOPE);
      return;
    }
    setScope((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      return next;
    });
  }

  const allSelected = scope.title && scope.triggers && scope.description;

  function replaceAll() {
    if (!findText) return;
    pushSnapshot(activeLorebookId, { entries: [...entries] });
    const updated = findReplace(entries, findText, replaceText, scope);
    updateEntries(activeLorebookId, updated);
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

// Find and replace field state, scope selector, match count display, and dispatch to find-replace service
import { useState, useEffect } from 'react';
import { useLorebookStore }  from '../state/lorebook-store.js';
import { useHistoryStore }   from '../state/history-store.js';
import { useSideLorebookId } from './use-side.js';
import { findReplace, countMatches } from '../services/find-replace.js';

const DEFAULT_SCOPE = { title: true, triggers: true, description: true };

export function useFindReplace(entries) {
  const [findText, setFindText]       = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scope, setScope]             = useState(DEFAULT_SCOPE);
  const [scopeOpen, setScopeOpen]     = useState(false);

  const targetId      = useSideLorebookId();
  const updateEntries = useLorebookStore((s) => s.updateEntries);
  const pushSnapshot  = useHistoryStore((s) => s.pushSnapshot);

  // Reset find/replace fields when the target lorebook changes.
  useEffect(() => {
    setFindText('');
    setReplaceText('');
    setScope(DEFAULT_SCOPE);
    setScopeOpen(false);
  }, [targetId]);

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
    pushSnapshot(targetId, { entries: [...entries] });
    const updated = findReplace(entries, findText, replaceText, scope);
    updateEntries(targetId, updated);
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

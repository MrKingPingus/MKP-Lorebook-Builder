// Find and replace field state, scope selector, per-lorebook match counts, and dispatch to find-replace service
import { useState, useEffect } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore } from '../state/history-store.js';
import { findReplace, countMatches } from '../services/find-replace.js';
import { CROSSTALK_ENABLED } from '../constants/crosstalk.js';

const DEFAULT_SCOPE = { title: true, triggers: true, description: true };

// `lorebookIds` is optional. Default is `[activeLorebookId]`; in crosstalk
// with a reference set, `[activeLorebookId, referenceLorebookId]` (nulls and
// unknown ids filtered). `matchesByLorebook` exposes a per-book breakdown so
// the preview can show which lorebook owns each hit. `replaceAll` still
// mutates the active lorebook only — per-side apply lands in D2.
export function useFindReplace({ lorebookIds } = {}) {
  const [findText, setFindText]       = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scope, setScope]             = useState(DEFAULT_SCOPE);
  const [scopeOpen, setScopeOpen]     = useState(false);

  const activeLorebookId    = useLorebookStore((s) => s.activeLorebookId);
  const referenceLorebookId = useLorebookStore((s) => s.referenceLorebookId);
  const lorebooks           = useLorebookStore((s) => s.lorebooks);
  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const pushSnapshot        = useHistoryStore((s) => s.pushSnapshot);

  const defaultIds = CROSSTALK_ENABLED && referenceLorebookId
    ? [activeLorebookId, referenceLorebookId]
    : [activeLorebookId];
  const resolvedIds = (lorebookIds ?? defaultIds).filter((id) => id && lorebooks[id]);

  // Reset fields when the scanned id set changes. Sorted so a crosstalk swap
  // (same two books, swapped roles) does not wipe the user's terms.
  const resolvedKey = [...resolvedIds].sort().join('|');
  useEffect(() => {
    setFindText('');
    setReplaceText('');
    setScope(DEFAULT_SCOPE);
    setScopeOpen(false);
  }, [resolvedKey]);

  const matchesByLorebook = resolvedIds.map((id) => ({
    id,
    name: lorebooks[id].name,
    count: countMatches(lorebooks[id].entries, findText, scope),
  }));
  const matchCount = matchesByLorebook.reduce((sum, m) => sum + m.count, 0);

  function toggleScope(field) {
    if (field === 'all') {
      setScope(DEFAULT_SCOPE);
      return;
    }
    setScope((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  // Whether "All" is effectively selected (all three fields on)
  const allSelected = scope.title && scope.triggers && scope.description;

  function replaceAll() {
    if (!findText) return;
    const active = lorebooks[activeLorebookId];
    if (!active) return;
    pushSnapshot({ entries: [...active.entries] });
    const updated = findReplace(active.entries, findText, replaceText, scope);
    updateActiveEntries(updated);
    setScopeOpen(false);
  }

  return {
    findText, setFindText,
    replaceText, setReplaceText,
    matchCount,
    matchesByLorebook,
    replaceAll,
    scope, toggleScope, allSelected,
    scopeOpen, setScopeOpen,
  };
}

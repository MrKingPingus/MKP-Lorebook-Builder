// Find and replace field state, scope selector, per-lorebook match counts, and dispatch to find-replace service
import { useState, useEffect } from 'react';
import { useLorebookStore } from '../state/lorebook-store.js';
import { useHistoryStore } from '../state/history-store.js';
import { findReplace, countMatches, matchDetails } from '../services/find-replace.js';

const DEFAULT_SCOPE = { title: true, triggers: true, description: true };

// `lorebookIds` is optional. Default is `[activeLorebookId]`; in crosstalk
// with a reference set, `[activeLorebookId, referenceLorebookId]` (nulls and
// unknown ids filtered). `matchesByLorebook` exposes a per-book breakdown
// (count + per-entry details with field locations) so the preview can show
// which entries own each hit. `replaceInActive` mutates the active lorebook;
// `replaceInReference` temporarily swaps ids at the store level so the
// snapshot+update target the reference book, then swaps back — only the ids
// flip, the visual side flag and selection are untouched. `replaceInBoth`
// composes both, pushing two snapshots in sequence.
export function useFindReplace({ lorebookIds } = {}) {
  const [findText, setFindText]       = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [scope, setScope]             = useState(DEFAULT_SCOPE);
  const [scopeOpen, setScopeOpen]     = useState(false);

  const activeLorebookId    = useLorebookStore((s) => s.activeLorebookId);
  const referenceLorebookId = useLorebookStore((s) => s.referenceLorebookId);
  const lorebooks           = useLorebookStore((s) => s.lorebooks);
  const updateActiveEntries = useLorebookStore((s) => s.updateActiveEntries);
  const swapReferenceIds    = useLorebookStore((s) => s.swapReference);
  const pushSnapshot        = useHistoryStore((s) => s.pushSnapshot);

  // Reference id is nulled when crosstalk is off (see use-settings.setCrosstalkEnabled),
  // so a non-null reference here implies crosstalk is on.
  const defaultIds = referenceLorebookId
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
    count:   countMatches(lorebooks[id].entries, findText, scope),
    entries: matchDetails(lorebooks[id].entries, findText, scope),
  }));
  const matchCount          = matchesByLorebook.reduce((sum, m) => sum + m.count, 0);
  const activeMatchCount    = matchesByLorebook.find((m) => m.id === activeLorebookId)?.count ?? 0;
  const referenceMatchCount = matchesByLorebook.find((m) => m.id === referenceLorebookId)?.count ?? 0;

  function toggleScope(field) {
    if (field === 'all') {
      setScope(DEFAULT_SCOPE);
      return;
    }
    setScope((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  // Whether "All" is effectively selected (all three fields on)
  const allSelected = scope.title && scope.triggers && scope.description;

  function replaceInActive() {
    if (!findText) return;
    const active = lorebooks[activeLorebookId];
    if (!active) return;
    pushSnapshot({ entries: [...active.entries] });
    const updated = findReplace(active.entries, findText, replaceText, scope);
    updateActiveEntries(updated);
    setScopeOpen(false);
  }

  // Swap ids at the store level so the reference book becomes active for the
  // snapshot+update, then swap back. Snapshot is taken *after* the swap so it
  // captures the right pre-state. The visual side flag stays put — only ids
  // flip, both swaps happen synchronously, and the lorebook map ends up with
  // the reference book's entries replaced.
  function replaceInReference() {
    if (!findText) return;
    const ref = lorebooks[referenceLorebookId];
    if (!ref) return;
    swapReferenceIds();
    pushSnapshot({ entries: [...ref.entries] });
    const updated = findReplace(ref.entries, findText, replaceText, scope);
    updateActiveEntries(updated);
    swapReferenceIds();
    setScopeOpen(false);
  }

  // Apply to both books in one click. Snapshots stack — active first, then
  // reference — so undo unwinds the reference mutation first, then the active
  // one. Same per-book undo caveat as `replaceInReference` applies on the
  // reference step (snapshot lands on the active stack regardless of which
  // book mutated).
  function replaceInBoth() {
    replaceInActive();
    replaceInReference();
  }

  return {
    findText, setFindText,
    replaceText, setReplaceText,
    matchCount,
    matchesByLorebook,
    activeMatchCount,
    referenceMatchCount,
    replaceInActive,
    replaceInReference,
    replaceInBoth,
    scope, toggleScope, allSelected,
    scopeOpen, setScopeOpen,
  };
}

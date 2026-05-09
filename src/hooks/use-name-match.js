// Name-overlap maps between active and reference lorebooks. Case-insensitive,
// whitespace-trimmed; empty names are ignored. Used by mobile annotations and
// the desktop "in both books" badges to surface name-level overlap, by the
// cross-match sort modes to partition entries by membership, and by the
// cross-pane diff badge tint to decide identical-vs-different.
import { useMemo } from 'react';
import { useEntries }            from './use-entries.js';
import { useReferenceLorebook }  from './use-reference-lorebook.js';

export function useNameMatch() {
  const { entries }            = useEntries();
  const { referenceLorebook }  = useReferenceLorebook();

  return useMemo(() => {
    const activeToRef       = new Map();  // activeEntryId    -> referenceEntryId
    const refToActive       = new Map();  // referenceEntryId -> activeEntryId
    const matchedNames      = new Set();  // lowercase trimmed names present on both sides
    const matchedRefByActive = new Map(); // activeEntryId    -> referenceEntry object
    const matchedActiveByRef = new Map(); // referenceEntryId -> activeEntry    object
    if (!referenceLorebook) {
      return { activeToRef, refToActive, matchedNames, matchedRefByActive, matchedActiveByRef };
    }

    const refByName    = new Map();
    const refEntryById = new Map();
    for (const re of referenceLorebook.entries) {
      const key = (re.name ?? '').trim().toLowerCase();
      if (key && !refByName.has(key)) refByName.set(key, re.id);
      refEntryById.set(re.id, re);
    }
    const activeByName    = new Map();
    const activeEntryById = new Map();
    for (const e of entries) {
      const key = (e.name ?? '').trim().toLowerCase();
      if (key && !activeByName.has(key)) activeByName.set(key, e.id);
      activeEntryById.set(e.id, e);
    }
    for (const [name, activeId] of activeByName) {
      if (refByName.has(name)) {
        const refId   = refByName.get(name);
        const refEntry    = refEntryById.get(refId);
        const activeEntry = activeEntryById.get(activeId);
        activeToRef.set(activeId, refId);
        refToActive.set(refId, activeId);
        matchedNames.add(name);
        if (refEntry)    matchedRefByActive.set(activeId, refEntry);
        if (activeEntry) matchedActiveByRef.set(refId, activeEntry);
      }
    }
    return { activeToRef, refToActive, matchedNames, matchedRefByActive, matchedActiveByRef };
  }, [entries, referenceLorebook]);
}

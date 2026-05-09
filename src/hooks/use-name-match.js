// Name-overlap maps between active and reference lorebooks. Case-insensitive,
// whitespace-trimmed; empty names are ignored. Used by mobile annotations and
// the desktop "in both books" badges to surface name-level overlap, and by
// the cross-match sort modes to partition entries by membership.
import { useMemo } from 'react';
import { useEntries }            from './use-entries.js';
import { useReferenceLorebook }  from './use-reference-lorebook.js';

export function useNameMatch() {
  const { entries }            = useEntries();
  const { referenceLorebook }  = useReferenceLorebook();

  return useMemo(() => {
    const activeToRef    = new Map();  // activeEntryId  -> referenceEntryId
    const refToActive    = new Map();  // referenceEntryId -> activeEntryId
    const matchedNames   = new Set();  // lowercase trimmed names present on both sides
    if (!referenceLorebook) return { activeToRef, refToActive, matchedNames };

    const refByName    = new Map();
    for (const re of referenceLorebook.entries) {
      const key = (re.name ?? '').trim().toLowerCase();
      if (key && !refByName.has(key)) refByName.set(key, re.id);
    }
    const activeByName = new Map();
    for (const e of entries) {
      const key = (e.name ?? '').trim().toLowerCase();
      if (key && !activeByName.has(key)) activeByName.set(key, e.id);
    }
    for (const [name, activeId] of activeByName) {
      if (refByName.has(name)) {
        activeToRef.set(activeId, refByName.get(name));
        refToActive.set(refByName.get(name), activeId);
        matchedNames.add(name);
      }
    }
    return { activeToRef, refToActive, matchedNames };
  }, [entries, referenceLorebook]);
}

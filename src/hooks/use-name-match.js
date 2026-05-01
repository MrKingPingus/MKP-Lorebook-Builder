// Map<activeEntryId, referenceEntryId> for active entries that have a
// same-named counterpart in the paired reference book. Case-insensitive,
// whitespace-trimmed; empty names are ignored. Used by mobile annotations
// (entry-name "ref" badge, Crosstalk row) to surface name-level overlap
// without rendering a second list of the reference book.
import { useMemo } from 'react';
import { useEntries }            from './use-entries.js';
import { useReferenceLorebook }  from './use-reference-lorebook.js';

export function useNameMatch() {
  const { entries }            = useEntries();
  const { referenceLorebook }  = useReferenceLorebook();

  return useMemo(() => {
    const map = new Map();
    if (!referenceLorebook) return map;
    const refByName = new Map();
    for (const re of referenceLorebook.entries) {
      const key = (re.name ?? '').trim().toLowerCase();
      if (key && !refByName.has(key)) refByName.set(key, re.id);
    }
    for (const e of entries) {
      const key = (e.name ?? '').trim().toLowerCase();
      if (key && refByName.has(key)) {
        map.set(e.id, refByName.get(key));
      }
    }
    return map;
  }, [entries, referenceLorebook]);
}

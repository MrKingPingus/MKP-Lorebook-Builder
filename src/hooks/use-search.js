// Search query state, filtered entry derivation, highlight positions, match count, and match location details
import { useUiStore } from '../state/ui-store.js';
import { escapeRegex } from '../services/html-escape.js';

export function useSearch(entries) {
  const searchQuery    = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const searchMode     = useUiStore((s) => s.searchMode);
  const setSearchMode  = useUiStore((s) => s.setSearchMode);

  const query = searchQuery.trim();

  let filteredEntries = entries;
  let matchCount = 0;
  let entryMatchCount = 0;
  // matchLocations: Map<entryId, string[]> — which fields matched ('name'|'trigger'|'description')
  const matchLocations = new Map();

  if (query) {
    const pattern = new RegExp(escapeRegex(query), 'gi');
    filteredEntries = entries.filter((e) => {
      const inName    = pattern.test(e.name);        pattern.lastIndex = 0;
      const inTrigger = e.triggers.some((t) => { const m = pattern.test(t); pattern.lastIndex = 0; return m; });
      const inDesc    = pattern.test(e.description); pattern.lastIndex = 0;
      return inName || inTrigger || inDesc;
    });

    for (const e of filteredEntries) {
      let entryMatches = 0;
      const locations = [];
      const countIn = (str) => {
        const m = str.match(new RegExp(escapeRegex(query), 'gi'));
        return m ? m.length : 0;
      };
      const nameCount = countIn(e.name);
      if (nameCount > 0) { entryMatches += nameCount; locations.push('name'); }
      let triggerCount = 0;
      e.triggers.forEach((t) => { triggerCount += countIn(t); });
      if (triggerCount > 0) { entryMatches += triggerCount; locations.push('trigger'); }
      const descCount = countIn(e.description);
      if (descCount > 0) { entryMatches += descCount; locations.push('description'); }
      if (entryMatches > 0) {
        matchCount += entryMatches;
        entryMatchCount++;
        matchLocations.set(e.id, locations);
      }
    }
  }

  return { searchQuery, setSearchQuery, searchMode, setSearchMode, filteredEntries, matchCount, entryMatchCount, query, matchLocations };
}
